const axios = require('axios');
var WebSocketClient = require('websocket').client;
const CHAIN= 'solana'
const WSS_PRICE_URL = `wss://public-api.birdeye.so/socket/${CHAIN}?x-api-key=${process.env.BIRDEYE_API_KEY}`

let PriceHolderInstance = {
    tokens: [],
    register: function(address) {
        if(PriceHolderInstance.tokens[address]) return

        PriceHolderInstance.tokens[address] = {
            client: null,
            price: 0,
            price_ath: 0
        }

        let query = `https://public-api.birdeye.so/defi/price?address=${address}`
        axios.get(query, {
            headers: {
                'accept': 'application/json',
                'x-chain': 'solana',
                'X-API-KEY': process.env.BIRDEYE_API_KEY
            }
        }).then(response => {
            if(response && response.data && response.data.data && response.data.success) {
                PriceHolderInstance.tokens[address].price = response.data.data.value
                PriceHolderInstance.tokens[address].price_ath = response.data.data.value
            }
        })

        var client = new WebSocketClient()
        PriceHolderInstance.tokens[address].client = client

        client.on('connect', async function (connection) {
            console.log('websocket connected: ' + address)
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
                
                if(PriceHolderInstance.tokens[address]) {
                    PriceHolderInstance.tokens[address].price = msgObj.data.c
                    if(PriceHolderInstance.tokens[address].price_ath < msgObj.data.c) {
                        PriceHolderInstance.tokens[address].price_ath = msgObj.data.c
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

        // if(Object.keys(PriceHolderInstance.tokens).length > 2) {
        //     PriceHolderInstance.unregister(address)
        // }
    },
    unregister: function(address) {
        let token = PriceHolderInstance.tokens[address]
        if(!token) return
        delete token.client
        delete PriceHolderInstance.tokens[address]
        console.log('PriceHolderInstance.unregister: length = ' + Object.keys(PriceHolderInstance.tokens).length)
    }
}

module.exports = {
    PriceHolderInstance
}