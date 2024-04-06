const axios = require('axios');
const { Transaction, HistoryTxn } = require('./models')
const { logTimeString } = require('./utils/utils')

let token_price = 100
let pageLimit = 10

let SubscriberTxCounter = {
    count_live: 0,
    count_hist: 0,
    prev_txns: [],
    clear: function() {
        SubscriberTxCounter.count_live = 0
        SubscriberTxCounter.count_hist = 0
    },
    add_live: function() {
        SubscriberTxCounter.count_live++
    },
    add_hist: function() {
        SubscriberTxCounter.count_hist++
    },
    checkTxnDuplicate: function(hash) {
        let dupTxns = this.prev_txns.filter(item => (item==hash))
        if(dupTxns && dupTxns.length > 0) return true
        this.prev_txns.push(hash)
        while(this.prev_txns.length > 1000) {
            this.prev_txns.shift()
        }
        return false
    }
}

function ask_price(token) {
    let query = `https://public-api.birdeye.so/defi/price?address=${token}`
    axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    })
    .then(response => {
        if(response.data.success)
            token_price = response.data.data.value
    })
    .catch(error => {
        console.log(`get_pair_transactions failed -> ${error}`);
    });
}

function fetch_liquidity(tx) {
    let query = `https://public-api.birdeye.so/defi/txs/token?address=${tx.token}&offset=0&limit=${pageLimit}&tx_type=add`
    axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    })
    .then(response => {
        if(!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length == 0) return        
        // console.log(response.data.data.items.map(item => item.txHash))
        let matchTx = response.data.data.items.filter(item => item.txHash == tx.txHash)
        if(matchTx && matchTx.length > 0) {
            // console.log('liquidity type is decided to ADD')
            tx.side = "add"

            console.log('tx.totalSol = ' + tx.totalSol)
            const t = new Transaction(tx)            
            t.save()
            .then(item => {                
                SubscriberTxCounter.add_live()
                console.log(`${logTimeString()} -> Liquidity Transactions: \x1b[33m${tx.side}\x1b[0m -> ${tx.total} -> ${tx.token}`)
            })
            .catch((e) => {
                console.log('ERROR: ', tx, '----------------->', e)
            }) 
        }
    })
    .catch(error => {
        console.log(`fetch_liquidity_add failed -> ${error}`);
    });

    query = `https://public-api.birdeye.so/defi/txs/token?address=${tx.token}&offset=0&limit=${pageLimit}&tx_type=remove`
    axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    })
    .then(response => {
        if(!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length == 0) return
        // console.log(response.data.data.items.map(item => item.txHash))
        let matchTx = response.data.data.items.filter(item => item.txHash == tx.txHash)
        if(matchTx && matchTx.length > 0) {
            // console.log('liquidity type is decided to REMOVE')            
            tx.side = "remove"
            tx.total *= (-1)
            tx.totalSol *= (-1)

            console.log('tx.totalSol = ' + tx.totalSol)
            const t = new Transaction(tx)            
            t.save()
            .then(item => {                
                SubscriberTxCounter.add_live()
                console.log(`${logTimeString()} -> Liquidity Transactions: \x1b[33m${tx.side}\x1b[0m -> ${tx.total} -> ${tx.token}`)
            })
            .catch((e) => {
                console.log('ERROR: ', tx, '----------------->', e)
            }) 
        }
    })
    .catch(error => {
        console.log(`fetch_liquidity_remove failed -> ${error}`);
    });
}

async function getTokenTrades(token, offset, limit) 
{
    let query = `https://public-api.birdeye.so/defi/txs/token?address=${token}&offset=${offset}&limit=${limit}&tx_type=all`
    let response = await axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    })
    if(!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length == 0) 
        return []
    
    return response.data.data.items
}

async function getPairTrades(pair, offset, limit, tx_type) 
{
    let query = `https://public-api.birdeye.so/defi/txs/pair?address=${pair}&offset=${offset}&limit=${limit}&tx_type=${tx_type}`
    let response = await axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    })
    if(!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length == 0) 
        return []
    
    return response.data.data.items
}

async function saveTokenTxnToDB(tx) {
    if(SubscriberTxCounter.checkTxnDuplicate(tx.txHash)) return

    const fromSymbol = tx.from.symbol ? tx.from.symbol : 'unknown'
    const toSymbol = tx.to.symbol ? tx.to.symbol : 'unknown'
    let tradeSymbol = fromSymbol
    let token = tx.from.address
    if(tradeSymbol == 'SOL') {
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

    if(!side || tx.from.amount == 0 || !tx.to.amount || !total) return

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
        toSymbol: toSymbol
    })
    t.save()
    .then(item => {                
        SubscriberTxCounter.add_live()                
    })
    .catch((e) => {
        console.log('ERROR: ', tx, '----------------->', e)
    })  
}

async function savePairTxnToDB(tx, sideType) {
    if(SubscriberTxCounter.checkTxnDuplicate(tx.txHash)) return

    let total = 0
    let fromSymbol = 'unknown'
    let toSymbol = 'unknown'
    let tradeSymbol = fromSymbol
    let token = ''
    let totalSol = 0
    let fromPrice = 0
    let toPrice = 0
    let side = 'sell'
    let type = 'transfer'
    let typeSwap = 'from'

    if(sideType == 'swap') {
        fromSymbol = tx.from.symbol ? tx.from.symbol : 'unknown'
        toSymbol = tx.to.symbol ? tx.to.symbol : 'unknown'
        tradeSymbol = fromSymbol
        token = tx.from.address
        fromPrice = tx.from.price ? tx.from.price : tx.from.nearestPrice
        toPrice = tx.to.price ? tx.to.price : tx.to.nearestPrice    
        total = fromPrice ? fromPrice * tx.from.uiAmount : toPrice * tx.to.uiAmount        
        totalSol = tx.to.amount
        type = tx.to.type
        typeSwap = tx.to.typeSwap

        if(tradeSymbol == 'SOL') {
            tradeSymbol = toSymbol
            token = tx.to.address
            totalSol = tx.from.amount
            side = 'buy'
        }
    }
    else if(sideType == 'add' || sideType == 'remove') {
        side = sideType
        type = 'liquidity'
        typeSwap = sideType
        if(tx.tokens && tx.tokens.length > 1 && tx.tokens[0].symbol == 'SOL') {
            totalSol = tx.tokens[0].amount
            total = totalSol * 180
            token = tx.tokens[1].address
            fromSymbol = 'SOL'
            toSymbol = tx.tokens[1].symbol
            tradeSymbol = toSymbol
        }
        if(tx.tokens && tx.tokens.length > 1 && tx.tokens[1].symbol == 'SOL') {
            totalSol = tx.tokens[1].amount
            total = totalSol * 180
            token = tx.tokens[0].address
            toSymbol = 'SOL'
            fromSymbol = tx.tokens[0].symbol
            tradeSymbol = fromSymbol
        }
    }
    
    totalSol /= 1000000000
    if(side == 'sell' || side == 'remove') {
        total *= (-1.0)
        totalSol *= (-1.0)
    }

    const t = new HistoryTxn({
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
        toSymbol: toSymbol
    })
    
    // if(side == 'add' || side == 'remove') {
    //     console.log(t)
    //     return
    // }

    t.save()
    .then(item => {                
        SubscriberTxCounter.add_hist()        
    })
    .catch((e) => {
        console.log('ERROR: ', tx, '----------------->', e)
    })  
}

module.exports = {
    SubscriberTxCounter,
    fetch_liquidity,
    getTokenTrades,
    getPairTrades,
    saveTokenTxnToDB,
    savePairTxnToDB
}