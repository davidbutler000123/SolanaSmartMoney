const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const checkMintAuthDisabled = async (MINT_ADDRESS) => {
  // Connect to the cluster
  let connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));

  // SPL Token Mint Address
  const mintAddress = new web3.PublicKey(MINT_ADDRESS);

  // Fetch mint account info
  const mintInfo = await splToken.getMint(connection, mintAddress);

  // Check if mint authority is disabled
  if (mintInfo.mintAuthority === null) {
    console.log('Mint authority is disabled. No new tokens can be minted.');
    return true
  } else {
    console.log(`Mint authority is still enabled: ${mintInfo.mintAuthority}`);
  }
  return false
}

module.exports = {    
    checkMintAuthDisabled
}