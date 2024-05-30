const { SmartWallet } = require('./models')
const { SmartWalletList } = require('./bird_api')

async function addWallet(address, type) {

    const existW = await SmartWallet.find({
        address: address,
        type: type
    })

    if(!existW || existW.length == 0) {
        const w = new SmartWallet({
            address: address,
            type: type
        })
        await w.save()
    }

    SmartWalletList.updateFromDb()
    const wallets = await SmartWallet.find({type: type})
    return wallets
}

async function deleteWallet(address, type) {

    await SmartWallet.deleteMany({
        address: address,
        type: type
    })

    SmartWalletList.updateFromDb()
    const wallets = await SmartWallet.find({type: type})
    return wallets
}

async function listWallet(type) {

    const wallets = await SmartWallet.find({
        type: type
    })
    return wallets
}

async function updateWallets(wallets, type) {

    await SmartWallet.deleteMany({
        type: type
    })

    if(wallets && wallets.length > 0) {
        for(let i = 0; i < wallets.length; i++) {
            const w = new SmartWallet({
                address: wallets[i],
                type: type
            })
            await w.save()
        }
    }

    SmartWalletList.updateFromDb()
    const dbWallets = await SmartWallet.find({
        type: type
    })
    
    return dbWallets
}

module.exports = {
    addWallet,
    deleteWallet,
    listWallet,
    updateWallets
}