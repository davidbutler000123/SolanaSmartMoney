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
  txAanalyzer.calcMetrics(req.query.token, req.query.period)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/fetchTokenHistory', (req, res) => {
  txAanalyzer.fetchTokenTradesHistory(req.query.token)
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
  txAanalyzer.calcPnlPerToken(req.query.token, rankSize)
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
  txAanalyzer.sortWallets(rankSize)
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
//* END ROUTES *//

app.listen(config.port, () => {
  console.log(
    colors.underline.bgBlack.bold.brightMagenta(
      `API is Running at http://localhost:${config.port}/api`
    )
  );
});
