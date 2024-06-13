const axios = require('axios');
const { HistoryTxn, TokenAudit } = require('./models')
const { tokenCreationInfo } = require('./bird_api');

const RAYDIUM_AUTHORITY_V4 = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'
const TOKEN_PROGRAM_ADDR = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

let CheckTokenAuditThread = {
    state: 0,
    progress: 0,
    task_count: 1,
    getPercent: () => {
        return 10 * CheckTokenAuditThread.progress / CheckTokenAuditThread.task_count
    }
}

async function askTotalSupply(txHash) {
    let totalSupply = 0

    try {
        let query = "https://solana-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY
        let response = await axios.post(query, {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'getTransaction',
            'params': [txHash, {encoding: "json", maxSupportedTransactionVersion:0}]
        })

        response.data.result.meta.postTokenBalances.forEach(element => {
            totalSupply += element.uiTokenAmount.uiAmount
        });
        //totalSupply = response.data.result.meta.postTokenBalances[0].uiTokenAmount.uiAmount
    } catch (error) {
        
    }
    console.log('totalSupply = ' + totalSupply)    
    return totalSupply
}

async function checkRenouncedAndLpburned(address, beforeTxnHash) {
    let { txHash, owner } = await tokenCreationInfo(address)
    let query = "https://solana-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY

    let filtering = {encoding: "json", maxSupportedTransactionVersion:0, until: txHash}
    if(beforeTxnHash && beforeTxnHash.length > 0) filtering.before = beforeTxnHash

    console.log(filtering)

    let response = ''
    try {
        response = await axios.post(query, {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'getSignaturesForAddress',
            'params': [owner, filtering]
        })
    } catch (error) {
        console.log(error.toString())
    }        
    if(!response.data || !response.data.result || response.data.result.length == 0) 
    {
        return {
            renounced: 0,
            lpburned: 0
        }
    }

    let txns = response.data.result
    if(txns.length > 20) {
        txns.splice(20, txns.length - 20)
    }

    let renouncedTime = 0
    CheckTokenAuditThread.task_count = txns.length
    for(let k = 0; k < txns.length; k++) {
        let signature = txns[k].signature
        console.log(`getTransaction: ${k+1} / ${txns.length} -> ${signature}`)
        CheckTokenAuditThread.progress = k + 1
        let freezeInstructions = []
        try {
            let detail_response = await axios.post(query, {
                'jsonrpc': '2.0',
                'id': 1,
                'method': 'getTransaction',
                'params': [signature, {encoding: "json", maxSupportedTransactionVersion:0}]
            })
    
            const FREEZE_AUTHORITY_DATA = 'bkGbjLJNggwBSCWTJk5RL3SQRCHJXWrqvPzW9447wtQtnT1'
            freezeInstructions = detail_response.data.result.transaction.message.instructions.filter(item => item.data == FREEZE_AUTHORITY_DATA)
            
        } catch (error) {
            console.log(error.toString())
        }
        if(freezeInstructions && freezeInstructions.length > 0) {
            renouncedTime = detail_response.data.result.blockTime
            console.log('freezeAccount found: tx = ' + signature + ', renouncedTime = ' + renouncedTime)
            break
        }
    }

    let mintRecord = await TokenAudit.find({token: address, type:'renounced', time:renouncedTime})
    if(!mintRecord || mintRecord.length == 0) {
        const t = new TokenAudit({
            token: address,
            type: 'renounced',
            time: renouncedTime
        })
        await t.save()
    }

    CheckTokenAuditThread.progress = CheckTokenAuditThread.task_count
    let lpburnedTimes = await getLpburn(address)
    for(let i = 0; i < lpburnedTimes.length; i++) {
        let time = lpburnedTimes[i]        
        
        let lpRecord = await TokenAudit.find({token: address, type:'lpburned', time:time})
        if(!lpRecord || lpRecord.length == 0) {
            const t = new TokenAudit({
                token: address,
                type: 'lpburned',
                time: time
            })
            await t.save()
        }
    }    

    return {
        renounced: renouncedTime,
        lpburned: lpburnedTimes
    }
}

async function fetchTxSignsForAddress(address) {
    let response = []
    let query = "https://solana-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY
    try {
        response = await axios.post(query, {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'getSignaturesForAddress',
            'params': [address, {encoding: "json", maxSupportedTransactionVersion:0}]
        })        
    } catch (error) {
        console.log(error.toString())
    }    
    return response
}

async function fetchTransaction(txHash) {
    let response = {}
    let query = "https://solana-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY
    try {
        response = await axios.post(query, {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'getTransaction',
            'params': [txHash, {encoding: "json", maxSupportedTransactionVersion:0}]
        })
    } catch (error) {
        console.log(error.toString())
    }    
    return response
}

async function getLpburn(token)
{
    let pipeline = [
        { $match: { 
            token: token,            
            type: 'liquidity',
            side: 'add'
        } 
        },
    ]

    let records = await HistoryTxn.aggregate(pipeline).exec()
    if(!records && records.length == 0)
    {
        return 0
    }
    
    let lpMintAccounts = []
    for(let i = 0; i < records.length; i++) {
        let txHash = records[i].txHash

        let response = await fetchTransaction(txHash)

        // let instructions = response.data.result.transaction.message.instructions
        // console.log('instructions: '); console.log(instructions)
        let accountKeys = response.data.result.transaction.message.accountKeys;
        let innerInstructions = response.data.result.meta.innerInstructions
        if(!innerInstructions || innerInstructions.length == 0) continue
        
        for(let k = 0; k < innerInstructions.length; k++) {
            if(!innerInstructions[k].instructions || innerInstructions[k].instructions.length == 0) continue
            let lpMintInst = innerInstructions[k].instructions[innerInstructions[k].instructions.length - 1]
            if(lpMintInst.accounts.length != 3) continue
            let prgId = accountKeys[lpMintInst.programIdIndex]
            let authCount = accountKeys[lpMintInst.accounts[2]]
            if(!prgId || prgId.toString() != TOKEN_PROGRAM_ADDR) continue
            if(!authCount || authCount.toString() != RAYDIUM_AUTHORITY_V4) continue
            console.log('lpMintInst: '); 
            console.log(lpMintInst)
            let mintAccount = accountKeys[lpMintInst.accounts[1]]
            lpMintAccounts.push(mintAccount)
        }
    }
    
    console.log('lpMintAccounts = '); console.log(lpMintAccounts)
    if(lpMintAccounts.length == 0) return 0

    // let lpBurnTime = 0
    let lbBurnTimes = []
    for(let i = 0; i < lpMintAccounts.length; i++) {
        let txSigns = await fetchTxSignsForAddress(lpMintAccounts[i])
        if(!txSigns.data.result || txSigns.data.result.length == 0) continue
        txSigns = txSigns.data.result.map(item => item.signature)
        if(!txSigns || txSigns.length < 2) continue
        let lpOneIsBurn = false
        for(let k = 0; k < txSigns.length - 1; k++) {
            let txn_response = await fetchTransaction(txSigns[k])
            if(txn_response.data.result.meta.status.Err) continue
            
            let instructions = txn_response.data.result.transaction.message.instructions
            if(!instructions || instructions.length == 0) continue
            let accountKeys = txn_response.data.result.transaction.message.accountKeys;
            let burnTxns = instructions.filter(item => {
                let prgId = accountKeys[item.programIdIndex]
                if(item.data == 'A' && prgId == TOKEN_PROGRAM_ADDR) return true
                return false
            })

            console.log('burnTxns.length = ' + burnTxns.length)
            
            // Checking CloseAccount Instruction
            if(burnTxns && burnTxns.length > 0) {
                lpOneIsBurn = true
                let blockTime = txn_response.data.result.blockTime
                lbBurnTimes.push(blockTime)
                // if(lpBurnTime < blockTime) lpBurnTime = blockTime
                break
            }
        }
        // if(!lpOneIsBurn) return 0
    }
    return lbBurnTimes
}

module.exports = {
    askTotalSupply,
    checkRenouncedAndLpburned,
    getLpburn,
    CheckTokenAuditThread
}