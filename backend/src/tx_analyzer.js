const { Transaction, HistoryTxn } = require('./models')
const { deleteDuplicates, deleteHistoryDuplicates } = require('./trade_indexer')
const { 
    getTokenTrades, 
    getPairTrades, 
    savePairTxnToDB,
    SubscriberTxCounter, 
    PriceProvider,
    askPriceHistory} = require('./bird_api')
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
    let pubTime = Math.floor(poolFromDexScreen.pairCreatedAt / 1000)
    let targetTime = Math.floor((poolFromDexScreen.pairCreatedAt + 49*3600*1000) / 1000)

    let periodType = '1m'
    switch(period) {
        case 3: periodType = '3m'; break;
        case 5: periodType = '5m'; break;
        case 15: periodType = '15m'; break;
        case 30: periodType = '30m'; break;
        case 60: periodType = '1H'; break;
    }

    await askPriceHistory(PriceProvider.sol_address, 'token', periodType, pubTime, targetTime)
    await askPriceHistory(token, 'token', periodType, pubTime, targetTime)

    let pipeline = [
        // { $unionWith: 'historytxns'},
        // { $match: { token: token, type: "transfer" } },
        { $match: { 
            token: token,            
            blockUnixTime: {                
                $lt: targetTime + 1
            } } 
        },
        { $project: 
            {
                blockUnixTime: 1,
                source: 1,
                owner: 1,
                token: 1,
                type: 1,
                side: 1,
                total: 1,
                solAmount: 1,
                baseAmount: 1,
                tradeSymbol: 1,
                tm: { $toInt: { $divide: ["$blockUnixTime", 60 * period] }}
            }
        },
        { $group:
            { 
                _id: {tm: "$tm", side: "$side", owner: "$owner"}, 
                tx_count: { $sum: 1 },
                total: { $sum: "$total"},
                solAmount: { $sum: "$solAmount"},
                baseAmount: { $sum: "$baseAmount"}
            }
        },
        {
            $sort: {"_id.tm": 1}
        }
    ]
            
    // let records = await Transaction.aggregate(pipeline).exec()
    let records = await HistoryTxn.aggregate(pipeline).exec()
    if(records.length > 0) records.pop()
    console.log('aggregateVolume: records.length = ' + records.length)
    return records
}

async function aggregateLiquidity(token, period) {
    let targetTime = Math.floor((poolFromDexScreen.pairCreatedAt + 49*3600*1000) / 1000)

    let pipeline = [
        // { $unionWith: 'historytxns'},
        { 
            $match: { 
                token: token, 
                type: "liquidity",
                blockUnixTime: {                
                    $lt: targetTime + 1
                } 
            }  
        },
        { 
            $project: {
                blockUnixTime: 1,
                source: 1,
                owner: 1,
                token: 1,
                type: 1,
                side: 1,
                total: 1,
                solAmount: 1,
                baseAmount: 1,
                tradeSymbol: 1,
                tm: { $toInt: { $divide: ["$blockUnixTime", 60 * period] }}
            }
        },
        { $group:
            { 
                _id: {tm: "$tm", side: "$side"}, 
                tx_count: { $sum: 1 },
                total: { $sum: "$total"},
                solAmount: { $sum: "$solAmount"},
                baseAmount: { $sum: "$baseAmount"}
            }
        },
        {
            $sort: {"_id.tm": 1}
        }
    ]
            
    // let records = await Transaction.aggregate(pipeline).exec()
    let records = await HistoryTxn.aggregate(pipeline).exec()
    return records
}

const calcMetrics = (token, period) => {
    return new Promise(async (resolve, reject) => {
        await askPriceFromDexScreen(token, resolve)
        if(!poolFromDexScreen) return
        //await deleteDuplicates()

        let initAddTxn = await HistoryTxn.find({token:token, type:'liquidity', side:'add'}).sort({blockUnixTime:1}).limit(2)
        if(initAddTxn.length > 1) initAddTxn = initAddTxn[0]
        let volRecords = await aggregateVolume(token, period)
        let liqRecords = await aggregateLiquidity(token, period)

        let initLiq = 0
        let totalSupply = 0
        if(initAddTxn && initAddTxn.solAmount) {
            console.log('init sol = ' + initAddTxn.solAmount)
            initLiq = initAddTxn.solAmount
            //totalSupply = initAddTxn.baseAmount
        }
        // console.log('liqRecords = ')
        // console.log(liqRecords)

        let pubTime = 0, lastTime = 0
        if(volRecords.length > 0) {
            pubTime = volRecords[0]._id.tm
            lastTime = volRecords[volRecords.length - 1]._id.tm
        }
        // if(liqRecords.length > 0) {
        //     if(pubTime > liqRecords[0]._id.tm)
        //         pubTime = liqRecords[0]._id.tm
        //     if(lastTime < liqRecords[liqRecords.length - 1]._id.tm)
        //         lastTime = liqRecords[liqRecords.length - 1]._id.tm
        // }
        let results = []        
        for(var t = 0; t < lastTime - pubTime; t++) {
            let liqBins = liqRecords.filter(item => item._id.tm == (pubTime + t))
            if(liqBins.length > 0) totalSupply += liqBins[0].baseAmount
            let tokenPrice = PriceProvider.queryToken((pubTime + t) * period)            
            results.push({
                bin: t + 1,
                timestamp: 0,
                fdv: totalSupply * tokenPrice,
                initLiq: initLiq,
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
        let totSol = 0
        let binSol = 0
        let prevBin = 0
        let wallets = []
        for(let i = 0; i < volRecords.length - 1; i++) {
            let item = volRecords[i]
            let bin = item._id.tm - pubTime
            if(bin >= results.length) continue
            let timestamp = fmtTimestr(item._id.tm * period * 60000)
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
            
            totSol += item.solAmount
            results[bin].timestamp = timestamp
            results[bin].liqSol = totSol
            results[bin].totalVolume = totVol
            results[bin].buyVolume -= buyAdd * item.total
            results[bin].sellVolume += sellAdd * item.total
            results[bin].totalTx += item.tx_count;
            results[bin].buyTx += buyAdd * item.tx_count;
            results[bin].sellTx += sellAdd * item.tx_count;
            if(prevBin != bin) {
                if(prevBin >= 0 && prevBin < results.length) {
                    results[prevBin].deltaLiq = binSol
                    binSol = 0
                    let totalHolders = wallets.filter((w) => Math.abs(w.baseAmount) > 10).length
                    results[prevBin].totalHolders = totalHolders                    
                }
            }
            binSol += item.solAmount
            let wIndex = wallets.findIndex((w) => (w.owner == item._id.owner))            
            if(wIndex >= 0) {
                wallets[wIndex].baseAmount += item.baseAmount
            }
            else {
                wallets.push({
                    owner: item._id.owner,
                    baseAmount: item.baseAmount
                })
            }

            prevBin = bin
        }

        if(liqRecords.length > 0) {
            let liqStartTime = liqRecords[0]._id.tm
            liqRecords.forEach(item => {
                let t = item._id.tm - pubTime
                // results[t].deltaLiq = item.solAmount
            })
        }

        let lastIdx = results.length - 1        
        //results[lastIdx].fdv = poolFromDexScreen.fdv
        //results[lastIdx].liqSol = poolFromDexScreen.liquidity.quote
        //results[lastIdx].liqSol = poolFromDexScreen.liquidity.usd        
        for(let i = lastIdx - 1; i >= 0; i--) {            
            // results[i].liqSol = results[i + 1].liqSol - results[i].deltaLiq
            results[i].deltaFdv = results[i + 1].fdv - results[i].fdv
            results[i].deltaVolume = results[i + 1].totalVolume - results[i].totalVolume
            results[i].deltaBuyVolume = results[i + 1].buyVolume - results[i].buyVolume
            results[i].deltaSellVolume = results[i + 1].sellVolume - results[i].sellVolume
            results[i].deltaAllTx = results[i + 1].totalTx - results[i].totalTx
            results[i].deltaBuyTx = results[i + 1].buyTx - results[i].buyTx
            results[i].deltaSellTx = results[i + 1].sellTx - results[i].sellTx
            results[i].deltaHolders = results[i + 1].totalHolders - results[i].totalHolders
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
    let targetTime = poolFromDexScreen.pairCreatedAt + 49*3600*1000
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
    let targetTime = poolFromDexScreen.pairCreatedAt + 49*3600*1000
    while(true) {
        let records = []
        try {
            records = await getPairTrades(pair, nOffset, 50, 'add')
        } catch (error) {
            console.log(error)
            break
        } 
        records.forEach(tx => {
            if(tx.blockUnixTime * 1000 <= targetTime) savePairTxnToDB(tx, 'add')
        })
        if(records.length == 0) break
        let txnTime = records[records.length - 1].blockUnixTime * 1000
        console.log(`${logTimeString()} : fetchOffsetAdd -> ${nOffset} : ${fmtTimestr(txnTime)}`)
        nOffset += records.length
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
            if(tx.blockUnixTime * 1000 <= targetTime) savePairTxnToDB(tx, 'remove')
        })
        if(records.length == 0) break
        let txnTime = records[records.length - 1].blockUnixTime * 1000
        console.log(`${logTimeString()} : fetchOffsetRemove -> ${nOffset} : ${fmtTimestr(txnTime)}`)
        nOffset += records.length
    }
}

async function getFetchPercent(token, pair) {

    let percent = 0
    let pubTime = Math.floor(poolFromDexScreen.pairCreatedAt / 1000)
    let targetTime = Math.floor((poolFromDexScreen.pairCreatedAt + 49*3600*1000) / 1000)
    console.log(`pair =  ${pair}, ${fmtTimestr(poolFromDexScreen.pairCreatedAt)}`)

    let pipe = [
        { $match:  { 
                blockUnixTime: {
                    $gt: pubTime, 
                    $lt: targetTime
                },
                token: token, 
                type: "transfer" 
            }
        },
        { $sort: { "blockUnixTime": 1 } }
    ]
    let records = await HistoryTxn.aggregate(pipe).exec()

    if(records.length > 1) {
        let nDuration = targetTime - pubTime
        let nFetched = targetTime - records[0].blockUnixTime
        percent = (100 * nFetched / nDuration).toFixed(2)
        
        console.log(`${fmtTimestr(records[0].blockUnixTime*1000)} -> ${fmtTimestr(records[records.length-1].blockUnixTime*1000)} : percent=${percent}%`)
        // console.log(records.map(item=>({
        //     blockUnixTime: fmtTimestr(item.blockUnixTime * 1000),
        //     side: item.side,
        //     solAmount: item.solAmount
        // })).slice(0, 3))
    }
    
    return percent
}

// fetch-state: 
  /*  0 - completed, 
      1 - insufficient, active, 
      2 - insufficient, inactive, 
      3 - not initiated
  */
async function fetchTokenTradesHistory(token)
{
    return new Promise(async (resolve, reject) => {
        await askPriceFromDexScreen(token, resolve)
        if(!poolFromDexScreen) return

        let pair = poolFromDexScreen.pairAddress
        if(!pair) return

        // console.log(poolFromDexScreen)
        //checkMintAuthDisabled()

        let fPercent = await getFetchPercent(token, pair)
        let nState = 0
        if(fPercent == 0) {
            nState = 3            
        }
        else if(fPercent == 100) {
            nState = 0
        }
        else {            
            if(SubscriberTxCounter.fetch_active)
                nState = 1
            else {
                nState = 2            
            }
        }

        resolve({
            state: nState,
            percent_100: fPercent * 100,
            percent: fPercent
        })

        if(SubscriberTxCounter.fetch_active || nState == 0 || nState == 1) return

        SubscriberTxCounter.fetch_active = true
        await fetchPairTradeHistoryForSwap(pair)
        await fetchPairTradeHistoryForLiquidity(pair)
        await deleteHistoryDuplicates()
        SubscriberTxCounter.fetch_active = false
    })
}

module.exports = {    
    calcMetrics,
    calcLiquidity,
    calcVolume,
    calcTxs,
    calcHolders,
    askPriceFromDexScreen,
    fetchTokenTradesHistory,
    getFetchPercent
}