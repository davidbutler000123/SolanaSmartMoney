
export const logTimeString = () => {
    let nowTime = new Date
    return nowTime.toLocaleDateString() + ' ' + nowTime.toLocaleTimeString()
}

export const fmtTimestr = (unixTime) => {
    let timeVal = new Date(unixTime)
    return timeVal.toLocaleDateString() + ' ' + timeVal.toLocaleTimeString()
}

export const checkLivePoolTime = (timeVal) => {
    if(Date.now() - timeVal < 3600*1000) return true
    return false
}

export const destructTradeTransaction = (tx) => {
    const fromSymbol = tx.from.symbol ? tx.from.symbol : 'unknown'
    const toSymbol = tx.to.symbol ? tx.to.symbol : 'unknown'
    let tradeSymbol = fromSymbol
    let token = tx.from.address
    if(tradeSymbol == 'SOL') {
        tradeSymbol = toSymbol
        token = tx.to.address
    }
    let solAmount = tx.from.amount / Math.pow(10, tx.from.decimals)
    let baseAmount = tx.to.amount / Math.pow(10, tx.to.decimals)
    if(tx.to.symbol == "SOL") {
        solAmount = tx.to.amount / Math.pow(10, tx.to.decimals)
        baseAmount = tx.from.amount / Math.pow(10, tx.from.decimals)
    }
    let side = tx.side
    return {
        txHash: tx.txHash,
        token,
        symbol: tradeSymbol,
        owner: tx.owner,
        side,
        solAmount,
        baseAmount
    }
}

export const calcTimeMins = (pairCreatedAt) => {
    let ageLabel = ''
    let timeMins = Math.floor((Date.now() - pairCreatedAt) / 60000)
    if(timeMins < 60) {
        ageLabel = timeMins + ' mins ago'
    }
    else if(timeMins < 1440) {
        ageLabel = Math.floor(timeMins / 60) + ' hours ago'
    }
    else {
        ageLabel = Math.floor(timeMins / 1440) + ' days ago'
    }
    return ageLabel
}