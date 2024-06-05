const mongoose = require('mongoose');

const alertSchema = mongoose.Schema({
  type: { type: Number, required: true },
  token: { type: String, required: true },
  owner: { type: String, required: true },
  buy: { type: Number, required: true },
  created: { type: Number, required: true }  
});

//module.exports = mongoose.model('Transaction', txSchema);
const conn = mongoose.createConnection(process.env.MONGO_DBURL)
module.exports = conn.model('WalletAlert', alertSchema);