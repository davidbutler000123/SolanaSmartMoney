const { Transaction, HistoryTxn } = require('./models')
const { connectBirdeyeWss } = require('./subscribe_txs_token')
const { SubscriberTxCounter } = require('./bird_api')
const { logTimeString } = require('./utils/utils')

const   DB_RANGE_TIME = process.env.DB_RANGE_TIME

async function deleteDuplicates() {
    
    // ********** remove old transactions *******************
    const aPastLimit = new Date(Date.now() - DB_RANGE_TIME)
    const nRangeStartTime = Math.floor(aPastLimit.getTime() / 1000)
    let result = await Transaction.collection.deleteMany({
        blockUnixTime: {$lt: nRangeStartTime}
    })

    console.log(`${logTimeString()} -> Old Transactions: \x1b[33m${result.deletedCount}\x1b[0m deleted.`)

    const duplicates = await Transaction.aggregate([
    {
        $group: {
            _id: {
            blockUnixTime: "$blockUnixTime",
            source: "$source",
            owner: "$owner",
            type: "$type",
            token: "$token",
            tradeSymbol: "$tradeSymbol",
            total: "$total",
            },
            ids: { $push: "$_id" },
            count: { $sum: 1 }
        }
    },
    {
        $match: {
            count: { $gt: 1 } // Having more than one occurrence
        }
    },
    {
        $project: {
            _id: 0, // Exclude this if you don't want to show the duplicated value
            ids: 1,
            count: 1, // Include or exclude count as needed
        }
    }], { allowDiskUse: true }
    ).exec()

    let dupIds = []
    for(let i = 0; i < duplicates.length; i++) {
        let tmpIds = duplicates[i].ids
        tmpIds.pop(0)        
        tmpIds.forEach(element => {
            dupIds.push(element)
        });        
    }
    let duplTxCount = dupIds.length
    while(dupIds.length > 0) {
        let subIds = dupIds.splice(0, 10000)
        await Transaction.deleteMany({
            _id: { $in: subIds }
        })
    }
    console.log(`deleteDuplicates: \x1b[35m${duplTxCount}\x1b[0m`)
}

async function deleteHistoryDuplicates() {
    
    // ********** remove duplicated history transactions *******************
    const duplicates = await HistoryTxn.aggregate([
    {
        $group: {
            _id: {
            blockUnixTime: "$blockUnixTime",
            source: "$source",
            owner: "$owner",
            type: "$type",
            token: "$token",
            tradeSymbol: "$tradeSymbol",
            solAmount: "$solAmount",
            },
            ids: { $push: "$_id" },
            count: { $sum: 1 }
        }
    },
    {
        $match: {
            count: { $gt: 1 } // Having more than one occurrence
        }
    },
    {
        $project: {
            _id: 0, // Exclude this if you don't want to show the duplicated value
            ids: 1,
            count: 1, // Include or exclude count as needed
        }
    }], { allowDiskUse: true }
    ).exec()

    let dupIds = []
    for(let i = 0; i < duplicates.length; i++) {
        let tmpIds = duplicates[i].ids
        tmpIds.pop(0)        
        tmpIds.forEach(element => {
            dupIds.push(element)
        });        
    }
    let duplTxCount = dupIds.length
    while(dupIds.length > 0) {
        let subIds = dupIds.splice(0, 10000)
        await HistoryTxn.deleteMany({
            _id: { $in: subIds }
        })
    }
    console.log(`deleteHistoryDuplicates: \x1b[35m${duplTxCount}\x1b[0m`)
}

function printNewTransactions() {
    console.log(`${logTimeString()} -> Live Txns: \x1b[36m${SubscriberTxCounter.count_live}\x1b[0m, History Txns: \x1b[36m${SubscriberTxCounter.count_hist}\x1b[0m added.`)
    if(SubscriberTxCounter.count_live == 0) {
        connectBirdeyeWss()
    }
    SubscriberTxCounter.clear()
}

function monitorTxTraffic() {
    printNewTransactions()
}

setInterval(monitorTxTraffic, 10000)
setTimeout(function() {
    setInterval(deleteDuplicates, 60000)
}, 5000)

module.exports = {
    deleteDuplicates,
    deleteHistoryDuplicates
}