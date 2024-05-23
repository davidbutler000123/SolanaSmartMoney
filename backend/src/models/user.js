const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  username: String,
  chatid: String,
});

//module.exports = mongoose.model('Transaction', txSchema);
const conn = mongoose.createConnection(process.env.MONGO_DBURL)
module.exports = conn.model('User', userSchema);