const axios = require('axios');
const { Transaction } = require('./models')
const { logTimeString } = require('./utils/utils')

let token_price = 100
let pageLimit = 10

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
                //SubscriberTxCounter.add()
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
                // SubscriberTxCounter.add()                
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

async function getTokenTrades(token, offset) 
{
    let query = `https://public-api.birdeye.so/defi/txs/token?address=${token}&offset=${offset}&limit=50&tx_type=all`
    let response = await axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    })
    if(!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length == 0) 
        return 0
    let txnCount = response.data.data.items.length
    // console.log('getTokenTrades returned counts: ' + txnCount)
    return txnCount
}

async function fetchTokenTradesHistory(token)
{
    let nOffset = 0
    while(true) {
        let nCount = await getTokenTrades(token, nOffset)
        if(nCount < 50) break
        nOffset += nCount
        console.log(`${logTimeString()} : fetchOffset -> ${nOffset}`)
    }
}

function targetTokenPrice() {
    return token_price
}

module.exports = {
    targetTokenPrice,
    fetch_liquidity,
    fetchTokenTradesHistory
}