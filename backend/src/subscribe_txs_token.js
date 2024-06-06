#!/usr/bin/env node
import * as instance from './bot.js';

var WebSocketClient = require('websocket').client;
const util = require("util")
const { COIN_TOKENS } = require('./utils/coin_tokens')
const { saveTokenTxnToDB, updateTokenList, SmartWalletList } = require('./bird_api')
const CHAIN= 'solana'

var client = new WebSocketClient();
let activeConnection
const { Transaction } = require('./models')
const WSS_TOKEN_URL = util.format(`wss://public-api.birdeye.so/socket/${CHAIN}?x-api-key=${process.env.BIRDEYE_API_KEY}`)

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
            let msgObj = null
            try {
                msgObj = JSON.parse(message.utf8Data)
            } catch (error) {
                console.log(error)
            }
            if(!msgObj || msgObj.type != 'TXS_DATA') return
            const tx = msgObj.data            

            if(tx.source.indexOf('raydium') != 0) {
                return
            }

            if(tx.from.symbol == 'USDT' ||
                tx.to.symbol == 'USDT' ||
                tx.from.symbol == 'USDC' ||
                tx.to.symbol == 'USDC'
            ) {
                return
            }

            if(tx.side != 'buy' && tx.side != 'sell') {
                updateTokenList(tx)
            }
            else if(tx.side == 'buy') {
                if (instance.bot_start)
                    SmartWalletList.checkNewTrade(tx)
            }
            saveTokenTxnToDB(tx)
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

// SmartWalletList.updateFromDb()
SmartWalletList.start()
setInterval(checkReconnect, 60000)  // check reconnecting per 1 minutes

module.exports = {    
    connectBirdeyeWss
}