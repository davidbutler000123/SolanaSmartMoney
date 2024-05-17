const mongoose = require('mongoose');

const walletSchema = mongoose.Schema({
  address: { type: String, required: true },
  type: { type: String, required: true }
});

//module.exports = mongoose.model('Transaction', txSchema);
const conn = mongoose.createConnection(process.env.MONGO_DBURL)
module.exports = conn.model('SmartWallet', walletSchema);