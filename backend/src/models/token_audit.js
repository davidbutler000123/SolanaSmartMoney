const mongoose = require('mongoose');

const tokenAuditSchema = mongoose.Schema({
  token: { type: String, required: true },
  type: { type: String, required: true }, // renounced or lpburned
  time: { type: Number, required: true }
});

//module.exports = mongoose.model('Transaction', txSchema);
const conn = mongoose.createConnection(process.env.MONGO_DBURL)
module.exports = conn.model('TokenAudit', tokenAuditSchema);