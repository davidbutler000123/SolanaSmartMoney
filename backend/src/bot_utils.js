const solanaWeb3 = require('@solana/web3.js');

export const getTimeStringUTC = (timestamp) => {

    const options = { 
        timeZone: 'Asia/Hong_Kong',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: 'numeric',
        timeZone: 'UTC'
    };
    
    const formattedDate = timestamp.toLocaleString('en-US', options);

    return formattedDate
}

export const getShortenedAddress = (address) => {

    if (!address) {
        return ''
    }

    let str = address.slice(0, 5) + '...' + address.slice(38)

    return str
}

export const get_amount = (inValue) => {
    
    let result_0 = Number(inValue)
    let result_K = Number(inValue) / 1000
    let result_M = Number(inValue) / (1000 * 1000)
    let result;

    if (result_M > 1)
        result = `${result_M.toFixed(1)}M`
    else if (result_K > 1)
        result = `${result_K.toFixed(1)}K`
    else
        result = `${result_0.toFixed(1)}`

    return result
}

export const isValidWalletAddress = (walletAddress) => {
    // // The regex pattern to match a wallet address.
    // const pattern = /^(0x){1}[0-9a-fA-F]{40}$/;
  
    // // Test the passed-in wallet address against the regex pattern.
    // return pattern.test(walletAddress);

    try {
        // Validate the address using PublicKey constructor
        new solanaWeb3.PublicKey(walletAddress);
        return true;
    } catch (e) {
        return false;
    }
}


