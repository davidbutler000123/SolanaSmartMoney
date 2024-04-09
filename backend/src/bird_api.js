const axios = require('axios');
const { Transaction, HistoryTxn } = require('./models')
const { logTimeString } = require('./utils/utils')

let token_price = 100
let pageLimit = 10

let SubscriberTxCounter = {
    count_live: 0,
    count_hist: 0,
    prev_txns: [],
    fetch_active: false,
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
        if(dupTxns && dupTxns.length > 0) {
            // console.log('duplicate occur: ' + hash)
            return true
        }
        this.prev_txns.push(hash)
        while(this.prev_txns.length > 10000) {
            this.prev_txns.shift()
        }
        return false
    }
}

let PriceProvider = {
    sol_address: 'So11111111111111111111111111111111111111112',
    sol_prices: [],
    token_prices: [],
    querySol: (time) => {
        let candPrices = PriceProvider.sol_prices.filter(item => item.unixTime == time)
        if(candPrices && candPrices.length > 0) return candPrices[0].value
        if(PriceProvider.sol_prices.length > 0) return PriceProvider.sol_prices[0].value
        return 0
    },
    queryToken: (time) => {
        let candPrices = PriceProvider.token_prices.filter(item => item.unixTime == time)
        if(candPrices && candPrices.length > 0) return candPrices[0].value
        if(PriceProvider.token_prices.length > 0) return PriceProvider.token_prices[0].value
        return 0
    }
}

async function askPriceHistory(address, address_type, type, time_from, time_to) {
    let query = `https://public-api.birdeye.so/defi/history_price?address=${address}&address_type=${address_type}&type=${type}&time_from=${time_from}&time_to=${time_to}`
    let response = await axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    })
    let prices = []
    if(response && response.data && response.data.success) {
        prices = response.data.data.items
    }
    
    if(address == PriceProvider.sol_address) PriceProvider.sol_prices = prices
    else {
        PriceProvider.token_prices = prices
        if(prices && prices.length > 2) {
            console.log('token_price = ' + prices[1].value)
        }
    }

    return prices
}

function fetchLiquidity(tx) {
    let query = `https://public-api.birdeye.so/defi/txs/token?address=${tx.token}&offset=0&limit=${pageLimit}&tx_type=add`
    // console.log(query)
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

            console.log('tx.solAmount = ' + tx.solAmount)
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
        console.log(`fetchLiquidity_add failed -> ${error}`);
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
            tx.solAmount *= (-1)

            console.log('tx.solAmount = ' + tx.solAmount)
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
        console.log(`fetchLiquidity_remove failed -> ${error}`);
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
    let query = `https://public-api.birdeye.so/defi/txs/pair?address=${pair}&offset=${offset}&limit=${limit}&tx_type=${tx_type}&sort_type=desc`
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
    let solAmount = tx.from.amount / Math.pow(10, tx.from.decimals)
    let baseAmount = tx.to.amount / Math.pow(10, tx.to.decimals)
    if(tx.to.symbol == "SOL") {
        solAmount = tx.to.amount / Math.pow(10, tx.to.decimals)
        baseAmount = tx.from.amount / Math.pow(10, tx.from.decimals)
    }
    let type = tx.from.type
    let typeSwap = tx.from.typeSwap
    let side = tx.side
    
    /*
    if(side != "buy" && side != "sell") {
        // console.log(tx)
        solAmount /= 1000000000.0
        // console.log(`Liquidity -> ${tx.txHash} : ${total}(${solAmount} sol) -> ${token} -> ${tx.owner}`)
        setTimeout(function() {
            fetchLiquidity({
                txHash: tx.txHash,
                blockUnixTime: tx.blockUnixTime,
                source: tx.source,
                owner: tx.owner,
                token: token,
                type: "liquidity",
                typeSwap: "liquidity",
                total: total,
                solAmount: solAmount,
                tradeSymbol: tradeSymbol,
                fromSymbol: fromSymbol,
                toSymbol: toSymbol
            })
        }, 500)
        return
    }
    */

    if(!side || tx.from.amount == 0 || !tx.to.amount || !total) return

    if(side == 'sell' || side =='remove') {
        total *= (-1.0)
        solAmount *= (-1.0)        
    }
    else {
        baseAmount *= (-1.0)
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
        solAmount: solAmount,
        baseAmount: baseAmount,
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
    let solAmount = 0
    let baseAmount = 0
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
        solAmount = tx.to.amount
        baseAmount = tx.from.amount / Math.pow(10, tx.from.decimals)
        type = tx.to.type
        typeSwap = tx.to.typeSwap

        if(tradeSymbol == 'SOL') {
            tradeSymbol = toSymbol
            token = tx.to.address
            solAmount = tx.from.amount            
            baseAmount = tx.to.amount / Math.pow(10, tx.to.decimals)
            side = 'buy'
        }
    }
    else if(sideType == 'add' || sideType == 'remove') {
        side = sideType
        type = 'liquidity'
        typeSwap = sideType
        if(tx.tokens && tx.tokens.length > 1 && tx.tokens[0].symbol == 'SOL') {
            solAmount = tx.tokens[0].amount
            baseAmount = tx.tokens[1].amount / Math.pow(10, tx.tokens[1].decimals)
            total = solAmount * 180 / 1000000000
            token = tx.tokens[1].address
            fromSymbol = 'SOL'
            toSymbol = tx.tokens[1].symbol
            tradeSymbol = toSymbol
        }
        if(tx.tokens && tx.tokens.length > 1 && tx.tokens[1].symbol == 'SOL') {
            solAmount = tx.tokens[1].amount
            baseAmount = tx.tokens[0].amount / Math.pow(10, tx.tokens[0].decimals)
            total = solAmount * 180 / 1000000000
            token = tx.tokens[0].address
            toSymbol = 'SOL'
            fromSymbol = tx.tokens[0].symbol
            tradeSymbol = fromSymbol
        }
    }
    
    solAmount /= 1000000000
    if(side == 'sell' || side == 'remove') {
        total *= (-1.0)
        solAmount *= (-1.0)        
    }
    if(side == 'buy' || side == 'remove') {
        baseAmount *= (-1)
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
        solAmount: solAmount,
        baseAmount: baseAmount,
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
    PriceProvider,
    askPriceHistory,
    fetchLiquidity,
    getTokenTrades,
    getPairTrades,
    saveTokenTxnToDB,
    savePairTxnToDB
}