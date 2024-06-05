const User = require('./user')
const Token = require('./token')
const Transaction = require('./transaction')
const HistoryTxn = require('./history_txn')
const TradeIndex = require('./trade_index')
const TokenAudit = require('./token_audit')
const SmartWallet = require('./smart_wallet')
const TokenAlert = require('./token_alert')
const WalletAlert = require('./wallet_alert')

async function AddNewToken(tObj) {
    const existToken = await Token.findOne({address: tObj.address})
    if(existToken) {
        if(!existToken.pairAddress && tObj.pairAddress) {
            existToken.totalSupply = tObj.totalSupply
            existToken.price = tObj.price
            existToken.priceAth = tObj.priceAth
            existToken.initLiquiditySol = tObj.initLiquiditySol
            existToken.initLiquidityUsd = tObj.initLiquidityUsd
            existToken.pairAddress = tObj.pairAddress
            existToken.pairCreatedAt = tObj.pairCreatedAt
            existToken.dexUrl = tObj.dexUrl
            existToken.webSiteUrl = tObj.webSiteUrl
            existToken.telegramUrl = tObj.telegramUrl
            existToken.twitterUrl = tObj.twitterUrl
            existToken.logoURI = tObj.logoURI
            existToken.save()
        }
    }
    else {
        const t = new Token(tObj)
        await t.save()
    }
}

async function FindToken(address) {
    const existToken = await Token.findOne({address: address})
    return existToken
}

module.exports = {
    'User': User,
    'Token': Token,
    'Transaction': Transaction,
    'HistoryTxn': HistoryTxn,
    'TradeIndex': TradeIndex,
    'TokenAudit': TokenAudit,
    'SmartWallet': SmartWallet,
    'TokenAlert': TokenAlert,
    'WalletAlert': WalletAlert,
    AddNewToken,
    FindToken    
}