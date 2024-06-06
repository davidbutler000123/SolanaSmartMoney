const mongoose = require('mongoose');

const tokenSchema = mongoose.Schema({
  address: { type: String, required: true },
  symbol: { type: String },
  totalSupply: { type: Number, required: true },
  price: { type: Number, required: true },
  priceAth: { type: Number, required: true },
  initLiquiditySol: { type: Number, required: true },
  initLiquidityUsd: { type: Number, required: true },
  pairAddress: String,
  pairCreatedAt: { type: Number, required: true },
  dexUrl: String,
  imageUrl: String,
  webSiteUrl: String,
  telegramUrl: String,
  twitterUrl: String,
  logoURI: String
});

const conn = mongoose.createConnection(process.env.MONGO_DBURL)
module.exports = conn.model('Token', tokenSchema);