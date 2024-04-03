#!/usr/bin/env node

var WebSocketClient = require('websocket').client;
const util = require("util")
const { COIN_TOKENS } = require('./utils/coin_tokens')
const { fetch_liquidity } = require('./bird_api')
const CHAIN= 'solana'

var client = new WebSocketClient();
let activeConnection
const { Transaction } = require('./models')
const WSS_TOKEN_URL = util.format(`wss://public-api.birdeye.so/socket/${CHAIN}?x-api-key=${process.env.BIRDEYE_API_KEY}`)
let SubscriberTxCounter = {
    count: 0,
    clear: function() {
        SubscriberTxCounter.count = 0
    },
    add: function() {
        SubscriberTxCounter.count++
    }    
}

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', async function (connection) {
    activeConnection = connection
    console.log('WebSocket Client Connected');
    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());        
        connection.close()
    });
    connection.on('close', function () {
        console.log('echo-protocol Connection Closed');
        setTimeout(connectBirdeyeWss, 1000)
    });
    connection.on('message', async function (message) {        
        if (message.type === 'utf8') {
            const msgObj = JSON.parse(message.utf8Data)
            if(msgObj.type != 'TXS_DATA') return
            const tx = msgObj.data            

            if(tx.source.indexOf('raydium') != 0) {
                return
            }

            const fromSymbol = tx.from.symbol ? tx.from.symbol : 'unknown'
            const toSymbol = tx.to.symbol ? tx.to.symbol : 'unknown'
            let tradeSymbol = fromSymbol
            let token = tx.from.address
            if(tradeSymbol == COIN_TOKENS[process.env.TARGET_NAME].symbol) {
                tradeSymbol = toSymbol
                token = tx.to.address
            }

            let total = tx.volumeUSD
            let totalSol = tx.from.amount
            if(tx.to.symbol == "SOL") totalSol = tx.to.amount
            let type = tx.from.type
            let typeSwap = tx.from.typeSwap
            let side = tx.side
            
            if(side != "buy" && side != "sell") {
                totalSol /= 1000000000.0
                console.log(`Liquidity -> ${tx.txHash} : ${total}(${totalSol} sol) -> ${token} -> ${tx.owner}`)
                // console.log("*******************************************")
                setTimeout(function() {
                    fetch_liquidity({
                        txHash: tx.txHash,
                        blockUnixTime: tx.blockUnixTime,
                        source: tx.source,
                        owner: tx.owner,
                        token:token,
                        type: "liquidity",
                        typeSwap: "liquidity",
                        total: total,
                        totalSol: totalSol,
                        tradeSymbol: tradeSymbol,
                        fromSymbol: fromSymbol,
                        toSymbol: toSymbol
                    })
                }, 100)
                return
            }

            // filtering out non-swap transactions
            if(!side || tx.from.amount == 0 || !tx.to.amount || !total) return

            // const fromSymbol = tx.from.symbol ? tx.from.symbol : 'unknown'
            // const toSymbol = tx.to.symbol ? tx.to.symbol : 'unknown'
            // let tradeSymbol = fromSymbol
            // token = tx.from.address
            // if(tradeSymbol == COIN_TOKENS[process.env.TARGET_NAME].symbol) {
            //     tradeSymbol = toSymbol
            //     token = tx.to.address
            // }

            if(side == 'sell') {
                total *= (-1.0)
                totalSol *= (-1.0)
            }

            const t = new Transaction({
                blockUnixTime: tx.blockUnixTime,
                source: tx.source,
                owner: tx.owner,
                token: token,
                type: type,
                typeSwap: typeSwap,
                side: side,
                total: total,
                totalSol: totalSol,
                tradeSymbol: tradeSymbol,
                fromSymbol: fromSymbol,
                // fromPrice: fromPrice,
                // fromAmount: tx.from.uiAmount,
                toSymbol: toSymbol
                // toPrice: toPrice,
                // toAmount: tx.to.uiAmount
            })
            t.save()
            .then(item => {                
                SubscriberTxCounter.add()                
            })
            .catch((e) => {
                console.log('ERROR: ', tx, '----------------->', e)
            })            
        }
    });

    const msg = {
        type: "SUBSCRIBE_TXS",
        data: {            
            address: COIN_TOKENS[process.env.TARGET_NAME].address
        }
    }
    connection.send(JSON.stringify(msg))
});

function connectBirdeyeWss() {    
    console.log(`Trying to connect BirdEye WSS: ${WSS_TOKEN_URL}`)
    client.connect(WSS_TOKEN_URL, 'echo-protocol', "https://birdeye.so");
}

let prevConnectTimeMark = Math.floor(new Date().getMinutes() / 30)
function checkReconnect() {
    let tmpTimeMark = Math.floor(new Date().getMinutes() / 30)  // reconnect per 30 minutes
    if(tmpTimeMark != prevConnectTimeMark) {
        try {
            if(activeConnection) activeConnection.close()
        } catch (error) {
            console.log(error)
        }
        prevConnectTimeMark = tmpTimeMark
    }
}

connectBirdeyeWss()

setInterval(checkReconnect, 60000)  // check reconnecting per 1 minutes

module.exports = {
    SubscriberTxCounter,
    connectBirdeyeWss
}