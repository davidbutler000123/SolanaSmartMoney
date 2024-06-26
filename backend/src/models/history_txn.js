const mongoose = require('mongoose');

const txSchema = mongoose.Schema({
  txHash: { type: String, required: true },
  blockUnixTime: { type: Number, required: true },
  source: { type: String, required: true },
  owner: { type: String, required: true },
  token: { type: String, required: true },
  type: { type: String, required: true },   // buy,sell,add-liquidity,remove-liquidity
  typeSwap: { type: String, required: true },
  side: { type: String, required: true },
  total: { type: Number, required: true },
  solAmount: { type: Number, required: true },
  baseAmount: { type: Number, required: true },
  tradeSymbol: { type: String, required: true },
  fromSymbol: { type: String, required: true },   // from symbol, for example 'USDC'
  // fromPrice: { type: Number },
  // fromAmount: { type: Number, required: true },
  toSymbol: { type: String, required: true }
  // toPrice: { type: Number },
  // toAmount: { type: Number, required: true }
});

//module.exports = mongoose.model('Transaction', txSchema);
const conn = mongoose.createConnection(process.env.MONGO_DBURL)
module.exports = conn.model('HistoryTxn', txSchema);