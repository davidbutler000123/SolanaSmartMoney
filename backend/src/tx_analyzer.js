const { Transaction, TradeIndex } = require('./models')
const { deleteDuplicates } = require('./trade_indexer')
const { targetTokenPrice } = require('./price_query')

const calcLiquidity = (token, period) => {
    return new Promise(async (resolve, reject) => {

        await deleteDuplicates()

        let limitTime = Math.floor(Date.now() / 1000) - period

        let query = { blockUnixTime: {$gt: limitTime}, token: token, type: "liquidity" }
        let records = await Transaction.find(query)
        let lpSum = 0
        records.forEach(element => {
            lpSum += element.total
        });
        
        resolve({
            token: token,
            change: lpSum,
            period: period,
            txs: records
        })
    })
}

const calcVolume = (token, period) => {
    return new Promise(async (resolve, reject) => {

        await deleteDuplicates()

        let limitTime = Math.floor(Date.now() / 1000) - period

        let query = { blockUnixTime: {$gt: limitTime}, token: token, type: "transfer" }        
        let records = await Transaction.find(query)
        let lpBuySum = 0
        let lpSellSum = 0
        records.forEach(element => {
            if(element.side == "buy") lpBuySum += element.total
            else if(element.side == "sell") lpSellSum += element.total
        });
        
        resolve({
            token: token,
            buy: lpBuySum,
            sell: lpSellSum * (-1),
            sum: lpBuySum - lpSellSum,
            txs: records
        })
    })
}

const calcTxs = (token, period) => {
    return new Promise(async (resolve, reject) => {

        await deleteDuplicates()

        let limitTime = Math.floor(Date.now() / 1000) - period

        let query = { blockUnixTime: {$gt: limitTime}, token: token, type: "transfer" }        
        let records = await Transaction.find(query)
        let buyCount = 0
        let sellCount = 0
        records.forEach(element => {
            if(element.side == "buy") buyCount += 1
            else if(element.side == "sell") sellCount += 1
        });
        
        resolve({
            token: token,
            buy: buyCount,
            sell: sellCount,
            total: buyCount + sellCount,
            txs: records
        })
    })
}

const calcHolders = (token, period) => {
    return new Promise(async (resolve, reject) => {

        await deleteDuplicates()

        let limitTime = Math.floor(Date.now() / 1000) - period
        let pipeline = [
            {$match: { blockUnixTime: {$gt: limitTime}, token: token, type: "transfer"}},
            {$group:{ _id: "$owner", tx_count: { $sum: 1 } }}
        ]

        let holders = await Transaction.aggregate(pipeline).exec()
        
        resolve({
            token: token,
            holder_cnt: holders.length,
            holders: holders,            
        })
    })
}

module.exports = {    
    calcLiquidity,
    calcVolume,
    calcTxs,
    calcHolders
}