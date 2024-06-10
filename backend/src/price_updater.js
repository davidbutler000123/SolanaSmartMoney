const axios = require('axios');
const { 
    Token
} = require('./models');
const { token } = require('morgan');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let PriceUpdaterInstance = {
    bRunning: false,
    start: function() {
        PriceUpdaterInstance.bRunning = true
        PriceUpdaterInstance.update()
    },
    stop: function() {
        PriceUpdaterInstance.bRunning = false
    },
    update: async function() {
        let tokens = await Token.find()

        let tsInitVal = Date.now()
        let tsConsume = 0
        let validTimeLimit = process.env.TOKEN_PRICE_VALID_LIMIT * 3600000 * 24
        for(let i = 0; i < tokens.length; i++) {
            let pairLifeTime = Date.now() - tokens[i].pairCreatedAt
            if(pairLifeTime > validTimeLimit) continue

            let tsVal = Date.now()
            let timeTo = Math.floor(tsVal / 1000)
            let timeFrom = timeTo - 1900
            let query = `https://public-api.birdeye.so/defi/ohlcv?address=${tokens[i].address}&type=30m&time_from=${timeFrom}&time_to=${timeTo}`
            let response = ''
            try {
                response = await axios.get(query, {
                    headers: {
                        'accept': 'application/json',
                        'x-chain': 'solana',
                        'X-API-KEY': process.env.BIRDEYE_API_KEY
                    }
                })
            } catch (error) {
                console.log(error.toString())
            }
            
            if(response && response.data && response.data.data && response.data.success &&
                response.data.data.items && response.data.data.items.length > 0) {                    
                let ohItem = response.data.data.items[response.data.data.items.length - 1]
                let t = tokens[i]
                t.price = ohItem.c
                //if(t.priceAth < ohItem.h) t.priceAth = ohItem.h
                if(t.priceAth < t.price) t.priceAth = t.price
                t.save()
                // console.log('price_query -> duration: ' + (Date.now() - tsVal))
            }
            await sleep(50)
        }
        tsConsume = (Date.now() - tsInitVal)
        console.log('price_query -> Whole consume: ' + tsConsume)

        if(PriceUpdaterInstance.bRunning){
            let updatePeriod = process.env.TOKEN_PRICE_UPDATE_PERIOD * 60000
            let waitForTime = updatePeriod - tsConsume
            if(waitForTime < 0) waitForTime = 1000
            setTimeout(PriceUpdaterInstance.update, waitForTime)
        }
    }
}

module.exports = {
    PriceUpdaterInstance
}