const { Transaction, HistoryTxn } = require('./models')
const { deleteDuplicates } = require('./trade_indexer')
const { getTokenTrades, getPairTrades, savePairTxnToDB } = require('./bird_api')
const axios = require('axios');
const { logTimeString, fmtTimestr } = require('./utils/utils');

let poolFromDexScreen = null

async function askPriceFromDexScreen(token, resolve) {
    let query = `https://api.dexscreener.io/latest/dex/tokens/${token}`

    let response = await axios.get(query)
    if(!response.data || !response.data.pairs || response.data.pairs.length == 0) {
        resolve({
            status: 1,
            message: "price_query_failed"
        })
        return false
    }

    let pool = response.data.pairs.filter(item => 
        item.chainId == 'solana' && 
        item.dexId == 'raydium' &&
        item.quoteToken.symbol == 'SOL') 
    if(!pool || pool.length == 0) {
        resolve({
            status: 1,
            message: "price_query_failed"
        })
        return false
    }
    poolFromDexScreen = pool[0]
    // console.log(poolFromDexScreen)
    return true
}

async function aggregateVolume(token, period) {
    let pipeline = [
        { $unionWith: 'historytxns'},
        { $match: { token: token, type: "transfer" } },
        { $project: 
            {
                blockUnixTime: 1,
                source: 1,
                owner: 1,
                token: 1,
                type: 1,
                side: 1,
                total: 1,
                tradeSymbol: 1,
                tm: { $toInt: { $divide: ["$blockUnixTime", 60 * period] }}
            }
        },
        { $group:
            { 
                _id: {tm: "$tm", side: "$side"}, 
                tx_count: { $sum: 1 },
                total: { $sum: "$total"}
            }
        },
        {
            $sort: {"_id.tm": 1}
        }
    ]
            
    let records = await Transaction.aggregate(pipeline).exec()
    return records
}

async function aggregateLiquidity(token, period) {
    let pipeline = [
        { $unionWith: 'historytxns'},
        { $match: { token: token, type: "liquidity" } },
        { $project: 
            {
                blockUnixTime: 1,
                source: 1,
                owner: 1,
                token: 1,
                type: 1,
                side: 1,
                total: 1,
                totalSol: 1,
                tradeSymbol: 1,
                tm: { $toInt: { $divide: ["$blockUnixTime", 60 * period] }}
            }
        },
        { $group:
            { 
                _id: {tm: "$tm", side: "$side"}, 
                tx_count: { $sum: 1 },
                total: { $sum: "$total"},
                totalSol: { $sum: "$totalSol"}
            }
        },
        {
            $sort: {"_id.tm": 1}
        }
    ]
            
    let records = await Transaction.aggregate(pipeline).exec()
    return records
}

const calcMetrics = (token, period) => {
    return new Promise(async (resolve, reject) => {
        await askPriceFromDexScreen(token, resolve)
        if(!poolFromDexScreen) return
        //await deleteDuplicates()        
        let volRecords = await aggregateVolume(token, period)
        let liqRecords = await aggregateLiquidity(token, period)

        // console.log('liqRecords = ')
        // console.log(liqRecords)

        let pubTime = 0, lastTime = 0
        if(volRecords.length > 0) {
            pubTime = volRecords[0]._id.tm
            lastTime = volRecords[volRecords.length - 1]._id.tm
        }
        let results = []
        for(var t = 0; t <= lastTime - pubTime; t++) {
            results.push({
                timestamp: t + 1,
                fdv: 0,
                initLiq: 0,
                liqSol: 0,
                totalVolume: 0,
                buyVolume: 0,
                sellVolume: 0,
                totalTx: 0,
                buyTx: 0,
                sellTx: 0,
                totalHolders: 0,
                deltaFdv: 0,
                deltaLiq: 0,
                deltaVolume: 0,
                deltaBuyVolume: 0,
                deltaSellVolume: 0,
                deltaAllTx: 0,
                deltaBuyTx: 0,
                deltaSellTx: 0,
                deltaHolders: 0
            })
        }
        let totVol = 0
        volRecords.forEach(item => {
            let t = item._id.tm - pubTime
            let volAdd = 0, buyAdd = 0, sellAdd = 0;
            if(item._id.side == "buy") {
                volAdd = 1;
                sellAdd = 1;
            }
            if(item._id.side == "sell") {
                volAdd = -1;
                buyAdd = 1;
            }
            totVol += volAdd * item.total
            results[t].totalVolume = totVol
            results[t].buyVolume -= buyAdd * item.total
            results[t].sellVolume += sellAdd * item.total
            results[t].totalTx += item.tx_count;
            results[t].buyTx += buyAdd * item.tx_count;
            results[t].sellTx += sellAdd * item.tx_count;
        })

        if(liqRecords.length > 0) {
            let liqStartTime = liqRecords[0]._id.tm
            liqRecords.forEach(item => {
                let t = item._id.tm - pubTime
                //results[t].deltaLiq = item.totalSol
                results[t].deltaLiq = item.total
            })
        }

        let lastIdx = results.length - 1        
        results[lastIdx].fdv = poolFromDexScreen.fdv
        //results[lastIdx].liqSol = poolFromDexScreen.liquidity.quote
        results[lastIdx].liqSol = poolFromDexScreen.liquidity.usd        
        for(let i = lastIdx - 1; i >= 0; i--) {
            results[i].liqSol = results[i + 1].liqSol - results[i].deltaLiq
            results[i].deltaVolume = results[i + 1].totalVolume - results[i].totalVolume
            results[i].deltaBuyVolume = results[i + 1].buyVolume - results[i].buyVolume
            results[i].deltaSellVolume = results[i + 1].sellVolume - results[i].sellVolume
            results[i].deltaAllTx = results[i + 1].totalTx - results[i].totalTx
            results[i].deltaBuyTx = results[i + 1].buyTx - results[i].buyTx
            results[i].deltaSellTx = results[i + 1].sellTx - results[i].sellTx
        }

        let tokenSymbol = "unknown"
        let symbolTx = await Transaction.aggregate([{$match: {token: token, type: "transfer"}}]).limit(1).exec()
        if(symbolTx.length > 0) tokenSymbol = symbolTx[0].tradeSymbol        
        resolve({
            status: 0,
            token:token,
            symbol: tokenSymbol,
            records: results
        })
    })
}

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

async function fetchPairTradeHistoryForSwap(pair) {
    let pairCreateTime = new Date(poolFromDexScreen.pairCreatedAt)
    console.log(`pairCreatetime = ${pairCreateTime.toLocaleDateString()}`)
    let targetTime = poolFromDexScreen.pairCreatedAt + 48*3600*1000
    let nOffset = 0
    let stepSize = 10000, direct = 1      // step for pair trades
    let approxReach = false
    let txnTime = Date.now()
    if(targetTime < Date.now()) {
        do {
            let txn = null
            try {
                //txn = await getTokenTrades(token, nOffset + stepSize * direct, 1)
                txn = await getPairTrades(pair, nOffset + stepSize * direct, 1, 'swap')
            } catch (error) {
                console.log(error)
                break
            }
            
            if(!txn || txn.length == 0) {
                stepSize /= 2
                continue
                // break
            }
            txnTime = txn[0].blockUnixTime * 1000
            nOffset += stepSize * direct
            console.log('nOffset = ' + nOffset + ', ' + new Date(txnTime).toLocaleDateString())
            let prevDirect = direct
            if(!approxReach && txnTime < targetTime) {
                approxReach = true
                stepSize = 10000
            }
            if(txnTime < targetTime) direct = -1
            else direct = 1
            if(!approxReach) stepSize *= 2
            else if(prevDirect != direct) stepSize /= 2
            stepSize = Math.round(stepSize)
            if(stepSize < 200) stepSize = 200
        } while(Math.abs(txnTime - targetTime) > (3600 * 1000));
    }

    while(true) {
        let records = []
        try {
            //records = await getTokenTrades(token, nOffset, 50)
            records = await getPairTrades(pair, nOffset, 50, 'swap')
        } catch (error) {
            console.log(error)
            break
        } 
        records.forEach(tx => {
            savePairTxnToDB(tx, 'swap')
        })
        if(records.length < 50) break
        nOffset += records.length
        let txnTime = records[0].blockUnixTime * 1000
        if(nOffset % 500 == 0) console.log(`${logTimeString()} : fetchOffsetSwap -> ${nOffset} : ${fmtTimestr(txnTime)}`)
    }
}

async function fetchPairTradeHistoryForLiquidity(pair) {
    let nOffset = 0
    while(true) {
        let records = []
        try {
            records = await getPairTrades(pair, nOffset, 50, 'add')
        } catch (error) {
            console.log(error)
            break
        } 
        records.forEach(tx => {
            savePairTxnToDB(tx, 'add')
        })
        if(records.length < 50) break
        nOffset += records.length
        let txnTime = records[0].blockUnixTime * 1000
        if(nOffset % 500 == 0) console.log(`${logTimeString()} : fetchOffsetAdd -> ${nOffset} : ${fmtTimestr(txnTime)}`)
    }

    nOffset = 0
    while(true) {
        let records = []
        try {
            records = await getPairTrades(pair, nOffset, 50, 'remove')
        } catch (error) {
            console.log(error)
            break
        } 
        records.forEach(tx => {
            savePairTxnToDB(tx, 'remove')
        })
        if(records.length < 50) break
        nOffset += records.length
        let txnTime = records[0].blockUnixTime * 1000
        if(nOffset % 500 == 0) console.log(`${logTimeString()} : fetchOffsetRemove -> ${nOffset} : ${fmtTimestr(txnTime)}`)
    }
}

async function fetchTokenTradesHistory(token)
{
    return new Promise(async (resolve, reject) => {
        await askPriceFromDexScreen(token, resolve)
        if(!poolFromDexScreen) return

        let pair = poolFromDexScreen.pairAddress
        console.log('pair = ' + pair)
        if(!pair) return

        await fetchPairTradeHistoryForSwap(pair)
        await fetchPairTradeHistoryForLiquidity(pair)
    })
}

module.exports = {    
    calcMetrics,
    calcLiquidity,
    calcVolume,
    calcTxs,
    calcHolders,
    askPriceFromDexScreen,
    fetchTokenTradesHistory
}