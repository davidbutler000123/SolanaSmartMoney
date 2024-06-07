const axios = require('axios');
const { 
    Transaction, 
    HistoryTxn, 
    Token, 
    SmartWallet,
    TokenAlert,
    WalletAlert,
    AddNewToken,
    FindToken
} = require('./models')
const { 
    logTimeString, 
    fmtTimestr, 
    checkLivePoolTime, 
    calcTimeMins,
    destructTradeTransaction } = require('./utils/utils');

const {
    getPoolInfo
} = require('./dexscreener_api')

const {
    PriceHolderInstance
} = require('./price_holder.js')

import * as instance from './bot.js';

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
    currentSol: 0,
    sol_prices: [],
    token_prices: [],
    querySol: (time) => {
        let candPrices = PriceProvider.sol_prices.filter(item => item.unixTime == time)
        if(candPrices && candPrices.length > 0) return candPrices[0].value
        if(PriceProvider.sol_prices.length > 0) return PriceProvider.sol_prices[0].value
        return 0
    },
    queryToken: (time) => {
        // console.log('queryToken->time = ' + time)
        let candPrices = PriceProvider.token_prices.filter(item => item.unixTime == time)
        if(candPrices && candPrices.length > 0) return candPrices[0].value
        if(PriceProvider.token_prices.length > 0) return PriceProvider.token_prices[0].value
        return 0
    },
    startSolQuerying: () => {
        setInterval(async function() {
            try {
                let query = 'https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112'
                let response = await axios.get(query, {
                    headers: {
                        'accept': 'application/json',
                        'x-chain': 'solana',
                        'X-API-KEY': process.env.BIRDEYE_API_KEY
                    }
                })
                
                if(response && response.data && response.data.success) {
                    PriceProvider.currentSol = response.data.data.value
                }
            } catch (error) {
                console.log(error.toString())
            }
            
        }, 10000)
    }
}

let TokenList = {
    tokens: [],
    alerts: [],
    initFromDb: async () => {
        let dbTokens = await Token.find().map(item => item.address)
        if(dbTokens && dbTokens.length > 0) TokenList.tokens = dbTokens
    },
    queryToken: (address, symbol) => {
        let existTokens = TokenList.tokens[address]
        if(existTokens) {
            return true
        }
        TokenList.tokens[address] = {
            address: address,
            symbol: symbol,
            buy: 0,
            sell: 0,
            pairCreatedAt: 0,
            holders: {},
            holder_count: 0,
            alerted: false
        }
        return false
    },
    increaseTokenBuy: (address) => {
        let token = TokenList.tokens[address]
        if(!token) return
        token.buy++
    },
    updateTokenPoolInfo: (address, pairCreatedAt) => {
        let token = TokenList.tokens[address]
        if(!token) return
        if(checkLivePoolTime(pairCreatedAt)) token.pairCreatedAt = pairCreatedAt
        else delete TokenList.tokens[address]
    },
    removeOldTokens: () => {
        Object.keys(TokenList.tokens).forEach(address => {
            let token = TokenList.tokens[address]
            if(!token) return
            if(!checkLivePoolTime(token.pairCreatedAt)) {
                delete TokenList.tokens[address]
            }
        })
    },
    updateTokenAlerted: (address, alerted) => {
        let token = TokenList.tokens[address]
        if(!token) return
        token.alerted = alerted
    },
    updateHolders: (token_addr, holder_addr, amount) => {
        let token = TokenList.tokens[token_addr]
        if(!token) return
        let holder = token.holders[holder_addr]
        if(!holder) {
            token.holders[holder_addr] = {
                address: holder_addr,
                amount: amount
            }            
        }
        else {
            holder.amount += amount
            if(holder.amount == 0) delete token.holders[holder_addr]            
        }
        token.holder_count = Object.keys(token.holders).length
        // token.holder_count = Object.values(token.holders).filter(item => item.amount > 0).length
    },
    pushNewAlert(alert) {
        console.log('pushNewAlert: ' + alert.address)
        TokenList.alerts.push(alert)

        try {
            const tAlert = new TokenAlert({
                type: 0,
                address: alert.address,
                buy: alert.buy,
                priceSignal: alert.price,
                fdvUsd: alert.totalSupply * alert.price,
                fdvSol: alert.totalSupply * alert.price / PriceProvider.currentSol,
                createdAt: Date.now(),
                holder_count: alert.holder_count
            })
            tAlert.save()

            AddNewToken({                
                address: alert.address,
                symbol: alert.symbol,
                totalSupply: alert.totalSupply,
                price: alert.price,
                priceAth: alert.price,
                initLiquiditySol: alert.initLiquiditySol,
                initLiquidityUsd: alert.initLiquidityUsd,
                pairAddress: alert.pairAddress,
                pairCreatedAt: alert.pairCreatedAt,
                dexUrl: alert.dexUrl,
                imageUrl: alert.imageUrl,
                webSiteUrl: alert.webSiteUrl,
                telegramUrl: alert.telegramUrl,
                twitterUrl: alert.twitterUrl,
                logoURI: alert.logoURI
            })
        } catch (error) {
            console.log(error.toString())
        }
        
        // PriceHolderInstance.register(alert.address)
        TokenList.alerts.forEach((alert, index, object) => {
            if(!checkLivePoolTime(alert.pairCreatedAt)) {
                // delete TokenList.alerts[index]
                object.splice(index, 1)
            }
        })
    }
}

let SmartWalletList = {
    limitPeriod: 3600000,  // 1 hour
    // limitPeriod: 60000,  // 1 minute
    singleWallets: {},
    groupWallets: {},
    singleTrades: [],
    groupTrades: [],
    groupLastTradeTimes: {},
    start: async () => {
        setTimeout(() => { SmartWalletList.begin_thread() }, 1000)
    },
    begin_thread: async () => {
        if (instance.bot_start){
            SmartWalletList.updateFromDb()
            return
        }
        setTimeout(() => { SmartWalletList.begin_thread() }, 1000)
    },
    updateFromDb: async () => {
        let dbWallets = await SmartWallet.find()
        SmartWalletList.singleWallets = {}
        SmartWalletList.groupWallets = {}
        for(let i = 0; i < dbWallets.length; i++) {
            const wallet = dbWallets[i]
            if(wallet.type == 'single') SmartWalletList.singleWallets[wallet.address] = wallet.type
            else {
                SmartWalletList.groupWallets[wallet.address] = wallet.type
                SmartWalletList.groupLastTradeTimes[wallet.address] = 0
            }
        }
    },
    clearOldTrades: async() => {
        const opFilter = (item) => 
            {
                let bResult = Date.now() - item.createdAt < SmartWalletList.limitPeriod
                if(!bResult) {
                    PriceHolderInstance.unregister(item.token)
                }
                return bResult
            }
        SmartWalletList.singleTrades = SmartWalletList.singleTrades.filter(opFilter)
        SmartWalletList.groupTrades = SmartWalletList.groupTrades.filter(opFilter)
    },
    checkNewTrade: async (tx) => {
        let bSingleSmart = false
        let bGroupSmart = false
        
        if(tx.side == 'buy' && SmartWalletList.singleWallets[tx.owner]) {            
            bSingleSmart = true
        }
        if(tx.side == 'buy' && SmartWalletList.groupWallets[tx.owner]) {            
            SmartWalletList.groupLastTradeTimes[tx.owner] = Date.now()
            let OldTradeWallets = Object.keys(SmartWalletList.groupWallets).filter(wallet => 
                (Date.now() - SmartWalletList.groupLastTradeTimes[wallet] > SmartWalletList.limitPeriod))
            if(!OldTradeWallets || OldTradeWallets.length == 0) bGroupSmart = true
        }

        if(bSingleSmart || bGroupSmart) {
            let alertType = 0
            let trade = destructTradeTransaction(tx)
            let walletCount = 1
            // PriceHolderInstance.register(trade.token)
            let poolInfo = await getPoolInfo(trade.token)
            if(!poolInfo.pairAddress) return

            poolInfo.fdvSol = poolInfo.fdvUsd / PriceProvider.currentSol
            poolInfo.liquidityUsd = poolInfo.liquiditySol * PriceProvider.currentSol
            poolInfo.initLiquidityUsd = poolInfo.initLiquiditySol * PriceProvider.currentSol

            trade['createdAt'] = Date.now()
            trade['pool'] = poolInfo

            if(bSingleSmart) {
                alertType = 0
                SmartWalletList.singleTrades.push(trade)

                if (poolInfo.tokenSymbol)
                    instance.sendWalletData(trade, true)
                console.log('New single wallet trade: owner= ' + tx.owner + 
                    ', count= ' + SmartWalletList.singleTrades.length)
            }
            if(bGroupSmart) {
                alertType = 1
                SmartWalletList.groupTrades.push(trade)
                walletCount = Object.keys(SmartWalletList.groupWallets).length
                
                if (poolInfo.tokenSymbol)
                    instance.sendWalletData(trade, false)

                console.log('New group wallet trade: owner= ' + tx.owner + 
                    ', count= ' + SmartWalletList.groupTrades.length)
            }
            
            try {
                const wAlert = new WalletAlert({
                    type: alertType,
                    token: trade.token,
                    owner: trade.owner,
                    buy: walletCount,
                    priceSignal: poolInfo.price,
                    fdvUsd: poolInfo.totalSupply * poolInfo.price,
                    fdvSol: poolInfo.totalSupply * poolInfo.price / PriceProvider.currentSol,
                    createdAt: Date.now()
                })
                wAlert.save()
                AddNewToken({
                    address: trade.token,
                    symbol: trade.symbol,
                    totalSupply: poolInfo.totalSupply,
                    price: poolInfo.price,
                    priceAth: poolInfo.price,
                    initLiquiditySol: poolInfo.initLiquiditySol,
                    initLiquidityUsd: poolInfo.initLiquidityUsd,
                    pairAddress: poolInfo.pairAddress,
                    pairCreatedAt: poolInfo.pairCreatedAt,
                    dexUrl: poolInfo.dexUrl,
                    imageUrl: poolInfo.imageUrl,
                    webSiteUrl: poolInfo.webSiteUrl,
                    telegramUrl: poolInfo.telegramUrl,
                    twitterUrl: poolInfo.twitterUrl,
                    logoURI: poolInfo.logoURI
                })
            } catch (error) {
                console.log(error.toString())
            }

            SmartWalletList.clearOldTrades()
        }
    }
}

async function askPriceHistory(address, address_type, type, time_from, time_to) {
    let query = `https://public-api.birdeye.so/defi/history_price?address=${address}&address_type=${address_type}&type=${type}&time_from=${time_from}&time_to=${time_to}`
    let response = []
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
    
    let prices = []
    if(response && response.data && response.data.success) {
        prices = response.data.data.items
    }
    
    if(address == PriceProvider.sol_address) PriceProvider.sol_prices = prices
    else {
        PriceProvider.token_prices = prices
        if(prices && prices.length > 2) {
            //console.log('token_price = ' + prices[1].value)
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
    let response = {}
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
    if(!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length == 0) 
        return []
    
    return response.data.data.items
}

async function getPairTrades(pair, offset, limit, tx_type) 
{
    let query = `https://public-api.birdeye.so/defi/txs/pair?address=${pair}&offset=${offset}&limit=${limit}&tx_type=${tx_type}&sort_type=desc`
    let response = {}
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
    
    if(!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length == 0) 
        return []
    
    return response.data.data.items
}

async function tokenCreationInfo(address) {
    let query = `https://public-api.birdeye.so/defi/token_creation_info?address=${address}`
    let response = {}
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
    let txHash = ''
    let owner = ''
    if(response.data && response.data.data && response.data.data.txHash) {
        txHash = response.data.data.txHash
        owner = response.data.data.owner
    }
    return {
        txHash,
        owner
    }
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

    if(side == 'buy') { TokenList.increaseTokenBuy(token) }
    if(side == 'buy' || side == 'sell') {
        TokenList.updateHolders(token, tx.owner, baseAmount * (-1))
    }

    const t = new Transaction({
        txHash: tx.txHash,
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
        txHash: tx.txHash,
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

async function updateTokenList(tx) {
    if(!tx) return    
    if(!tx.from || !tx.to) return
    let token_addr = ''
    let token_symbol = ''
    if(tx.from.symbol == 'SOL' || tx.from.symbol == 'USDC' || tx.from.symbol == 'USDT') {
        if(tx.to.symbol == 'SOL' || tx.to.symbol == 'USDC' || tx.to.symbol == 'USDT') return
        token_addr = tx.to.address
        token_symbol = tx.to.symbol + '-' + tx.from.symbol
    }
    else if(tx.to.symbol == 'SOL' || tx.to.symbol == 'USDC' || tx.to.symbol == 'USDT') {
        if(tx.from.symbol == 'SOL' || tx.from.symbol == 'USDC' || tx.from.symbol == 'USDT') return
        token_addr = tx.from.address
        token_symbol = tx.from.symbol + '-' + tx.to.symbol
    }    
    if(token_addr == '') return

    TokenList.removeOldTokens()
    if(TokenList.queryToken(token_addr, token_symbol)) return

    let nowTime = Date.now()
    let query = `https://api.dexscreener.io/latest/dex/tokens/${token_addr}`
    let response = {}
    try {
        response = await axios.get(query)
    }
    catch(error) {
        console.log(error.toString())
    }
    
    if(!response.data || !response.data.pairs || response.data.pairs.length == 0) {
        TokenList.updateTokenPoolInfo(token_addr, nowTime)
        return
    }
    let pools = response.data.pairs.filter(item => 
        item.chainId == 'solana' && 
        item.dexId == 'raydium' &&
        item.quoteToken.symbol == 'SOL') 
    if(!pools || pools.length == 0) {
        TokenList.updateTokenPoolInfo(token_addr, nowTime)
        return
    }
    let pool = pools[0]

    let tzOffset = new Date().getTimezoneOffset()
    let pairCreatedAt = pool.pairCreatedAt + tzOffset * 60000    
    TokenList.updateTokenPoolInfo(token_addr, pairCreatedAt)
    return
}

function getTokenAlerts(offset, limit, type) {
    // let alerts = []
    // if(limit < 1 || TokenList.alerts.length <= offset ||
    //     TokenList.alerts.length == 0 ||
    //     offset < 0
    // ) {
    //     return {
    //         result: 0,
    //         total: 0,
    //         alerts: []
    //     }
    // }    
    // for(let i = TokenList.alerts.length - offset - 1; i >= 0; i--) {
    //     let alert = TokenList.alerts[i]
    //     if(PriceHolderInstance.tokens[alert.address]) {
    //         alert.price = PriceHolderInstance.tokens[alert.address].price
    //         alert.price_ath = PriceHolderInstance.tokens[alert.address].price_ath
    //         alert.fdvNowUsd = alert.price * alert.totalSupply
    //         if(PriceProvider.currentSol > 0) alert.fdvNowSol = alert.fdvNowUsd / PriceProvider.currentSol
    //         alert.fdvAthUsd = alert.price_ath * alert.totalSupply
    //         if(PriceProvider.currentSol > 0) alert.fdvAthSol = alert.fdvAthUsd / PriceProvider.currentSol
    //         if(alert.initLiquiditySol > 0) alert.roiNow = alert.fdvNowSol / alert.initLiquiditySol
    //         if(alert.initLiquiditySol > 0) alert.roiAth = alert.fdvAthSol / alert.initLiquiditySol
    //     }
    //     alerts.push(alert)
    //     if(alerts.length >= limit) break
    // }
    // return {
    //     result: 0,
    //     total: TokenList.alerts.length,
    //     alerts: alerts
    // }
    return new Promise(async (resolve, reject) => {
        let total = await TokenAlert.countDocuments({type: type})
        total = Math.ceil(total / limit)
        const result = await TokenAlert.aggregate([
            {
                $match: {
                    type: type
                }
            },
            {
                $lookup: {
                    from: 'tokens',
                    localField: 'address',
                    foreignField: 'address',
                    as: 'tokenInfo'
                }
            },
            {   $unwind:"$tokenInfo" },
            {   
                $project:{
                    address : 1,
                    buy : 1,
                    fdvSol: 1,
                    fdvUsd: 1,
                    holder_count : 1,
                    createdAt: 1,
                    symbol : "$tokenInfo.symbol",
                    totalSupply : "$tokenInfo.totalSupply",
                    price : "$tokenInfo.price",
                    priceAth : "$tokenInfo.priceAth",
                    initLiquiditySol : "$tokenInfo.initLiquiditySol",
                    initLiquidityUsd : "$tokenInfo.initLiquidityUsd",
                    pairAddress : "$tokenInfo.pairAddress",
                    pairCreatedAt : "$tokenInfo.pairCreatedAt",
                    dexUrl : "$tokenInfo.dexUrl",
                    imageUrl : "$tokenInfo.imageUrl",
                    webSiteUrl : "$tokenInfo.webSiteUrl",
                    telegramUrl : "$tokenInfo.telegramUrl",
                    twitterUrl : "$tokenInfo.twitterUrl",
                    logoURI : "$tokenInfo.logoURI"
                } 
            }
        ])
        .skip(offset * limit).limit(limit)
        .exec()

        for(let i = 0; i < result.length; i++) {
            let item = result[i]
            item.pairAgeLabel = calcTimeMins(item.pairCreatedAt)

            item.fdvNowUsd = item.price * item.totalSupply
            if(PriceProvider.currentSol > 0) item.fdvNowSol = item.fdvNowUsd / PriceProvider.currentSol
            item.fdvAthUsd = item.priceAth * item.totalSupply
            if(PriceProvider.currentSol > 0) item.fdvAthSol = item.fdvAthUsd / PriceProvider.currentSol
            if(item.fdvUsd > 0) {
                item.roiNow = item.fdvNowUsd / item.fdvUsd
                item.roiAth = item.fdvAthUsd / item.fdvUsd
            }
        }

        resolve({
            result: 0,
            total: total,
            alerts: result
        })
    })  
}

function getWalletAlerts(offset, limit, type) {
    // let trades = []
    // let targetTrades = []
    // if(type == 0) {
    //     targetTrades = SmartWalletList.singleTrades
    // }
    // else {
    //     targetTrades = SmartWalletList.groupTrades
    // }
    // if(limit < 1 || targetTrades.length <= offset ||
    //     targetTrades.length == 0 ||
    //     offset < 0
    // ) {
    //     return {
    //         result: 0,
    //         total: 0,
    //         alerts: []
    //     }
    // }    
    // for(let i = targetTrades.length - offset - 1; i >= 0; i--) {
    //     let trd = targetTrades[i]
    //     if(PriceHolderInstance.tokens[trd.token]) {
    //         trd.pool.price = PriceHolderInstance.tokens[trd.token].price
    //         trd.pool.price_ath = PriceHolderInstance.tokens[trd.token].price_ath
    //         trd.pool.fdvNowUsd = trd.pool.price * trd.pool.totalSupply
    //         if(PriceProvider.currentSol > 0) trd.pool.fdvNowSol = trd.pool.fdvNowUsd / PriceProvider.currentSol
    //         trd.pool.fdvAthUsd = trd.pool.price_ath * trd.pool.totalSupply
    //         if(PriceProvider.currentSol > 0) trd.pool.fdvAthSol = trd.pool.fdvAthUsd / PriceProvider.currentSol
    //         if(trd.pool.initLiquiditySol > 0) trd.pool.roiNow = trd.pool.fdvNowSol / trd.pool.initLiquiditySol
    //         if(trd.pool.initLiquiditySol > 0) trd.pool.roiAth = trd.pool.fdvAthSol / trd.pool.initLiquiditySol
    //     }
    //     trades.push(trd)
    //     if(trades.length >= limit) break
    // }
    // return {
    //     result: 0,
    //     total: targetTrades.length,
    //     alerts: trades
    // }
    return new Promise(async (resolve, reject) => {
        let total = await WalletAlert.countDocuments({type: type})
        total = Math.ceil(total / limit)
        let result = await WalletAlert.aggregate([
            {
                $match: {
                    type: type
                }
            },
            {
                $lookup: {
                    from: 'tokens',
                    localField: 'token',
                    foreignField: 'address',
                    as: 'tokenInfo'
                }
            },
            {   $unwind:"$tokenInfo" },
            {   
                $project:{
                    token : 1,
                    owner : 1,
                    buy : 1,
                    fdvSol: 1,
                    fdvUsd: 1,
                    createdAt: 1,
                    symbol : "$tokenInfo.symbol",
                    totalSupply : "$tokenInfo.totalSupply",
                    price : "$tokenInfo.price",
                    priceAth : "$tokenInfo.priceAth",
                    initLiquiditySol : "$tokenInfo.initLiquiditySol",
                    initLiquidityUsd : "$tokenInfo.initLiquidityUsd",
                    pairAddress : "$tokenInfo.pairAddress",
                    pairCreatedAt : "$tokenInfo.pairCreatedAt",
                    dexUrl : "$tokenInfo.dexUrl",
                    imageUrl : "$tokenInfo.imageUrl",
                    webSiteUrl : "$tokenInfo.webSiteUrl",
                    telegramUrl : "$tokenInfo.telegramUrl",
                    twitterUrl : "$tokenInfo.twitterUrl",
                    logoURI : "$tokenInfo.logoURI"
                } 
            }
        ])
        .skip(offset * limit).limit(limit)
        .exec()

        for(let i = 0; i < result.length; i++) {
            let item = result[i]
            item.pairAgeLabel = calcTimeMins(item.pairCreatedAt)

            item.fdvNowUsd = item.price * item.totalSupply
            if(PriceProvider.currentSol > 0) item.fdvNowSol = item.fdvNowUsd / PriceProvider.currentSol
            item.fdvAthUsd = item.priceAth * item.totalSupply
            if(PriceProvider.currentSol > 0) item.fdvAthSol = item.fdvAthUsd / PriceProvider.currentSol
            if(item.fdvUsd > 0) {
                item.roiNow = item.fdvNowUsd / item.fdvUsd
                item.roiAth = item.fdvAthUsd / item.fdvUsd
            }
        }

        resolve({
            result: 0,
            total: total,
            alerts: result
        })
    })    
}

PriceProvider.startSolQuerying()

module.exports = {
    SubscriberTxCounter,
    PriceProvider,
    TokenList,
    SmartWalletList,
    askPriceHistory,
    fetchLiquidity,
    getTokenTrades,
    getPairTrades,
    tokenCreationInfo,
    saveTokenTxnToDB,
    savePairTxnToDB,
    updateTokenList,
    getTokenAlerts,
    getWalletAlerts
}