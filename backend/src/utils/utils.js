import { PublicKey,Connection } from "@solana/web3.js";
import { Metaplex } from '@metaplex-foundation/js';
import { TokenListProvider } from '@solana/spl-token-registry';

const dotenv = require('dotenv')
dotenv.config()

const mainRPC = process.env.MAINNET_RPC;
const connection = new Connection(mainRPC, "confirmed");

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

export const getTokenInfo = async (addr) => {
    const metaplex = Metaplex.make(connection);

    const mintAddress = new PublicKey(addr);

    const metadataAccount = metaplex
        .nfts()
        .pdas()
        .metadata({ mint: mintAddress });

    const metadataAccountInfo = await connection.getAccountInfo(metadataAccount);

    if (metadataAccountInfo) {
        const token = await metaplex
            .nfts()
            .findByMint({ mintAddress: mintAddress });
        if (token) {
            console.log('utils: token = ')
            console.log(token)

            return { exist: true, symbol: token.mint.currency.symbol, decimal: token.mint.currency.decimals }
        } else {
            return { exist: false, symbol: "", decimal: 0 }
        }
    } else {
        const provider = await new TokenListProvider().resolve();
        const tokenList = provider.filterByChainId(101).getList();
        const tokenMap = tokenList.reduce((map, item) => {
            map.set(item.address, item);
            return map;
        }, new Map());

        const token = tokenMap.get(mintAddress.toBase58());

        if (token) {
            return { exist: true, symbol: token.mint.currency.symbol, decimal: token.mint.currency.decimals }
        } else {
            return { exist: false, symbol: "", decimal: 0 }
        }
    }
}