import express from 'express';
import config from './config';

import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';

import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import colors from 'colors';

import { guard, newToken } from './utils/auth';

require('./subscribe_txs_token')
require('./trade_indexer')
const txAanalyzer = require('./tx_analyzer')
const alchemyApi = require('./alchemy_api')

const app = express();

//* CONFIG *//
app.disable('x-powered-by'); //? Disable default header

app.use(cors()); //? CORS Enabled
app.use(json()); //? Body parser for application/json POST data
app.use(urlencoded({ extended: true })); //? Body parser for application/x-www-form-urlencoded POST data

app.use(helmet()); //? Securiy Headers Default config
app.use(xss()); //? Prevent Cross Site Scripting
app.use(hpp()); //? Prevent HTTP param pollution

app.use(morgan('dev')); //? Server Logger
//* END CONFIG *//

//* ROUTES *//
app.get('/api', (req, res) => {
  res.send('API ROOT ⚡️');
});

app.get('/api/calcMetrics', (req, res) => {
  let period = parseInt(req.query.period)
  if(period <= 0) period = 5
  txAanalyzer.calcMetrics(req.query.token, period)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/fetchTokenHistory', (req, res) => {
  let until = parseInt(req.query.until)
  if(until < 0) until = 2
  if(until > 4) until = 4
  txAanalyzer.fetchTokenTradesHistory(req.query.token, until)
  .then(result => {
    res.send(result)
  })
  .catch(error => {
    console.log(error)
    res.send({
      state: 4,
      message: error
    })
  })
})

app.get('/api/calcPnlPerToken', (req, res) => {
  let rankSize = parseInt(req.query.rankSize)
  if(rankSize <= 0) rankSize = 10
  if(rankSize > 100) rankSize = 100
  let filterZero = parseInt(req.query.filterZero)
  if(filterZero < 0) filterZero = 1
  let sortMode = req.query.sortMode
  txAanalyzer.calcPnlPerToken(req.query.token, rankSize, filterZero, sortMode)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/calcTopTrader', (req, res) => {
  let rankSize = parseInt(req.query.rankSize)
  if(rankSize <= 0) rankSize = 10
  if(rankSize > 100) rankSize = 100
  let filterZero = parseInt(req.query.filterZero)
  if(filterZero < 0) filterZero = 1
  let sortMode = req.query.sortMode
  txAanalyzer.calcTopTrader(req.query.wallet, rankSize, filterZero, sortMode)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/sortWallets', (req, res) => {
  let rankSize = parseInt(req.query.rankSize)
  if(rankSize <= 0) rankSize = 10
  if(rankSize > 100) rankSize = 100
  let filterZero = parseInt(req.query.filterZero)
  if(filterZero < 0) filterZero = 1
  let filterTokenAtleast = parseInt(req.query.filterTokenAtleast)
  if(filterTokenAtleast < 1) filterZero = 2
  let sortMode = req.query.sortMode
  txAanalyzer.sortWallets(rankSize, filterZero, filterTokenAtleast, sortMode)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/calcVolume', (req, res) => {  
  txAanalyzer.calcVolume(req.query.token, req.query.period)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/calcTxs', (req, res) => {  
  txAanalyzer.calcTxs(req.query.token, req.query.period)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/calcHolders', (req, res) => {  
  txAanalyzer.calcHolders(req.query.token, req.query.period)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/getLpburn', (req, res) => {  
  alchemyApi.getLpburn(req.query.token)
  res.send(
    {
      result: 0
    }
  )  
})
//* END ROUTES *//

app.listen(config.port, () => {
  console.log(
    colors.underline.bgBlack.bold.brightMagenta(
      `API is Running at http://localhost:${config.port}/api`
    )
  );
});
