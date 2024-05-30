const axios = require('axios');

export const getPoolInfo = async (token) => {
    let query = 'https://api.dexscreener.io/latest/dex/tokens/' + token
    let response = {}
    try {
        response = await axios.get(query)
    } catch (error) {
        console.log(error.toString())
    }

    let tokenName = ''
    let tokenSymbol = ''
    let fdvUsd = 0
    let liquiditySol = 0
    let pairAddress = ''
    let pairCreatedAt = 0
    let pairLifeTimeMins = 0
    let pairAgeLabel = ''
    let dexUrl = ''
    let webSiteUrl = ''
    let telegramUrl = ''
    let twitterUrl = ''
    if(response.data && response.data.pairs && response.data.pairs.length > 0) {
        let pools = response.data.pairs.filter(item => 
            item.chainId == 'solana' && 
            item.dexId == 'raydium' &&
            item.quoteToken.symbol == 'SOL') 
        if(pools && pools.length > 0) {
            let validPool = pools[0]

            if(validPool.baseToken) {
                tokenName = validPool.baseToken.name
                tokenSymbol = validPool.baseToken.symbol
            }
            if(validPool.liquidity) liquiditySol = validPool.liquidity.quote
            fdvUsd = validPool.fdv
            pairAddress = validPool.pairAddress
            pairCreatedAt = validPool.pairCreatedAt
            pairLifeTimeMins = Math.floor((Date.now() - pairCreatedAt) / 60000)
            if(pairLifeTimeMins < 60) {
                pairAgeLabel = pairLifeTimeMins + ' mins ago'
            }
            else if(pairLifeTimeMins < 1440) {
                pairAgeLabel = Math.floor(pairLifeTimeMins / 60) + ' hours ago'
            }
            else {
                pairAgeLabel = Math.floor(pairLifeTimeMins / 1440) + ' days ago'
            }

            if(validPool.url) dexUrl = validPool.url
            if(validPool.info && validPool.info.websites && validPool.info.websites.length > 0) {
                webSiteUrl = validPool.info.websites[0].url
            }
            if(validPool.info && validPool.info.socials && validPool.info.socials.length > 1) {
                let socialTel = validPool.info.socials.filter(item => item.type == 'telegram')
                if(socialTel && socialTel.length > 0) telegramUrl = socialTel[0].url
                let socialTwit = validPool.info.socials.filter(item => item.type == 'twitter')
                if(socialTwit && socialTwit.length > 0) twitterUrl = socialTwit[0].url
            }                    
        }                
    } 

    if(pairAddress == '') return {}
    
    query = `https://public-api.birdeye.so/defi/token_overview?address=${token}`
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
    
    let logoURI = ''
    let price = 0
    let totalSupply = 0
    if(response && response.data && response.data.data && response.data.data.logoURI) {
        logoURI = response.data.data.logoURI
        price = response.data.data.price
        totalSupply = response.data.data.supply
    }
    
    let initLiquiditySol = 0
    query = `https://public-api.birdeye.so/defi/txs/pair?address=${pairAddress}&offset=0&limit=1&tx_type=add&sort_type=desc`
    response = await axios.get(query, {
        headers: {
            'accept': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': process.env.BIRDEYE_API_KEY
        }
    })
    if(response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
        let trade = response.data.data.items[0]
        if(trade.tokens && trade.tokens.length > 0 && trade.tokens[0].symbol == 'SOL') {
            initLiquiditySol = trade.tokens[0].amount / (10 ** trade.tokens[0].decimals)
        }
        else if(trade.tokens && trade.tokens.length > 1 && trade.tokens[1].symbol == 'SOL') {
            initLiquiditySol = trade.tokens[1].amount / (10 ** trade.tokens[1].decimals)
        }
    }
    
    return {
        tokenName,
        tokenSymbol,
        fdvUsd,        
        liquiditySol,
        initLiquiditySol,
        price,
        totalSupply,
        fdvAthSol: 0,
        fdvAthUsd: 0,
        fdvNowSol: 0,
        fdvNowUsd: 0,
        roiAth: 0,
        roiNow: 0,
        pairAddress,
        pairCreatedAt,
        pairLifeTimeMins,
        pairAgeLabel,
        dexUrl,
        webSiteUrl,
        telegramUrl,
        twitterUrl,
        logoURI
    }
}