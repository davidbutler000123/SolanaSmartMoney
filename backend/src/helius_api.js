const WebSocket = require('ws');
const dotenv = require('dotenv')
dotenv.config()
const axios = require('axios');
var WebSocketClient = require('websocket').client;
import {
    updateTokenListFromHelius
} from './bird_api'

const WSS_PRICE_URL = `wss://public-api.birdeye.so/socket/solana?x-api-key=${process.env.BIRDEYE_API_KEY}`
const HELIUS_API_KEY = process.env.HELIUS_API_KEY

const RAYDIUM_AMM_PROG_ACCOUNT = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
const ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`);

let NewPairMonitor = {
    limit: 10,
    pairs: [],
    solPrice: 200,
    addNew: function(pair) {
        let existPairs = NewPairMonitor.pairs.filter(item => item.address == pair.token)
        if(existPairs && existPairs.length > 0) return
        NewPairMonitor.pairs.push(pair)        
        NewPairMonitor.checkAudit(pair)
        // pair.wsClient = registerPriceWebsocket(pair.token)
        if(NewPairMonitor.pairs.length > NewPairMonitor.limit) {
            try {
                // NewPairMonitor.pairs[0].wsClient.close()
                // delete NewPairMonitor.pairs[0].wsClient
                NewPairMonitor.pairs.splice(0, 1)
            } catch (error) {
                console.log(error.toString())
            }
        }
    },
    checkAudit: async function(pair) {
        try {
            const response = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`, {
                method: 'POST',
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    mintAccounts: [pair.token]
                }),
            });
            const data = await response.json();
            const tokenInfo = data[0].onChainAccountInfo.accountInfo.data.parsed.info
            const metaInfo = data[0].onChainMetadata.metadata.data

            pair.tokenAmount = pair.circleSupply / (10 ** tokenInfo.decimals)
            pair.price = pair.mcUsd / pair.tokenAmount
            pair.name = metaInfo.name
            pair.symbol = metaInfo.symbol
            pair.logUri = metaInfo.uri
            pair.decimals = tokenInfo.decimals,
            pair.totalSupply = tokenInfo.supply,
            pair.bRenounced = tokenInfo.mintAuthority == '',
            pair.bNotRugged = tokenInfo.freezeAuthority == ''

            updateTokenListFromHelius(pair)
        } catch (err) {
            console.error("Error: ", err);
        }
    },
    updateTokenInfo: function(newInfo) {
        let existPairs = NewPairMonitor.pairs.filter(item => item.token == newInfo.address)
        if(!existPairs && existPairs.length == 0) return
        let targetPair = existPairs[0]
    },
    getCurrentPairs: function() {
        return NewPairMonitor.pairs.map(item => {
            let lifeTime = Date.now() - item.createdAt
            let lifeTimeStr = ''
            lifeTime = Math.floor(lifeTime / 1000)
            if(lifeTime < 60) { lifeTimeStr = lifeTime + 's ago'}
            else if(lifeTime < 3600) { 
                lifeTime = Math.floor(lifeTime / 60)
                lifeTimeStr = lifeTime + 'm ago'
            }
            else {
                lifeTime = Math.floor(lifeTime / 3600)
                lifeTimeStr = lifeTime + 'h ago'
            }
            return {
                token: item.token,
                name: item.name,
                symbol: item.symbol,
                lifeTime: lifeTimeStr,
                pool: item.pool,
                bRenounced: item.bRenounced,
                bNotRugged: item.bNotRugged,
                mcUsd: item.mcUsd,
                initLiquiditySol: item.initLiquiditySol,
                initLiquidityUsd: item.initLiquidityUsd
            }
        })
    }
}

function registerPriceWebsocket(address) {
    var client = new WebSocketClient()

    client.on('connect', async function (connection) {
        connection.on('error', function (error) {
            connection.close()
        });
        connection.on('message', async function (message) {        
            if (message.type !== 'utf8') return

            let msgObj = null
            try {
                msgObj = JSON.parse(message.utf8Data)
            } catch (error) {
                console.log(error)
            }
            if(!msgObj || msgObj.type != 'PRICE_DATA') return
            
            if(msgObj.data.address == process.env.SOL_MINT_ADDRESS) {
                NewPairMonitor.solPrice = msgObj.data.c
            }
            else {
                for(let i = 0; i < NewPairMonitor.pairs.length; i++) {
                    let item = NewPairMonitor.pairs[i]
                    if(item.token == msgObj.data.address) {
                        item.price = msgObj.data.c
                        item.mcUsd = msgObj.data.c * item.tokenAmount
                    }
                    NewPairMonitor.pairs[i] = item
                }
            }
        });
        const msg = {
            type: "SUBSCRIBE_PRICE",
            data: {            
                address: address,
                queryType: 'simple',
                chartType: '1m',
                currency: 'usd'
            }
        }
        connection.send(JSON.stringify(msg))
    })
    
    client.connect(WSS_PRICE_URL, 'echo-protocol', "https://birdeye.so");
    return client
}

function getInitSolPrice() {
    let query = `https://public-api.birdeye.so/defi/price?address=${process.env.SOL_MINT_ADDRESS}`
    axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    }).then(response => {
        if(response && response.data && response.data.data && response.data.success) {
            NewPairMonitor.solPrice = response.data.data.value
        }
    })

    registerPriceWebsocket(process.env.SOL_MINT_ADDRESS)
}

// Function to send a request to the WebSocket server
function sendRequest(ws) {
    const request = {
        jsonrpc: "2.0",
        id: 420,
        method: "transactionSubscribe",
        params: [
            {
                accountInclude: [RAYDIUM_AMM_PROG_ACCOUNT]    // account for Raydium’s AMM Program Address
            },
            {
                commitment: "confirmed",
                encoding: "jsonParsed",
                transactionDetails: "full",
                // showRewards: true,
                maxSupportedTransactionVersion: 0
            }
        ]
    };
    ws.send(JSON.stringify(request));
}

ws.on('open', function open() {
    console.log('WebSocket is open');
    sendRequest(ws);  // Send a request once the WebSocket is open
});

ws.on('message', function incoming(data) {
    const messageStr = data.toString('utf8');
    try {
        const messageObj = JSON.parse(messageStr);
        if(!messageObj || !messageObj.params || !messageObj.params.result) return

        const result = messageObj.params.result;
        if(!result.signature || !result.transaction) return

        const signature = result.signature; // Extract the signature        
        const logs = result.transaction.meta.logMessages;

        let initLogStr = logs.filter(log => log.includes("initialize2: InitializeInstruction2"))
        if(initLogStr && initLogStr.length > 0) initLogStr = initLogStr[0]
        else initLogStr = null

        if (logs && initLogStr) {
            const instructions = result.transaction.transaction.message.instructions
            let ammInstruction = instructions.filter(item => item.programId == RAYDIUM_AMM_PROG_ACCOUNT)
            if(ammInstruction && ammInstruction.length > 0) ammInstruction = ammInstruction[0]
            let ammAccounts = ammInstruction.accounts

            let pcAmountStr = initLogStr.match("init_pc_amount: (\\d)*")
            let coinAmountStr = initLogStr.match("init_coin_amount: (\\d)*")
            if(pcAmountStr && pcAmountStr.length > 0) pcAmountStr = pcAmountStr[0].replace("init_pc_amount: ", "")
            if(coinAmountStr && coinAmountStr.length > 0) coinAmountStr = coinAmountStr[0].replace("init_coin_amount: ", "")
            let pcAmount = parseInt(pcAmountStr)
            let coinAmount = parseInt(coinAmountStr)

            let token = ammAccounts[8]
            let solAmount = pcAmount / (10**9)
            let circleSupply = coinAmount
            if(token.includes('So11111111111111111111111111111111111111112')) {
                token = ammAccounts[9]
                solAmount = coinAmount / (10**9)
                circleSupply = pcAmount
            }

            let newPair = {
                tx: signature,
                pool: ammAccounts[4],
                owner: ammAccounts[17],
                token,
                createdAt: Date.now(),
                solAmount,
                circleSupply,                
                mcUsd: solAmount * NewPairMonitor.solPrice,
                initLiquiditySol: 2 * solAmount,
                initLiquidityUsd: 2 * solAmount * NewPairMonitor.solPrice
            }

            NewPairMonitor.addNew(newPair)            
        }

    } catch (e) {
        console.error('Failed to parse JSON:', e);
    }
});

ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

ws.on('close', function close() {
    console.log('WebSocket is closed');
}); 

// getInitSolPrice()

// setInterval(function() {
//     console.log(NewPairMonitor.getCurrentPairs())
// }, 2000)

module.exports = {
    NewPairMonitor
}