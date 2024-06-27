import express from 'express';
import config from './config';

import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';

import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import colors from 'colors';

import { PriceUpdaterInstance } from './price_updater.js';

require('./subscribe_txs_token')
require('./trade_indexer')
require('./helius_api.js')
import { getTokenInfo } from'./utils/utils.js'
getTokenInfo('FwioCtW1bgJrWRkPi8hzYLHq5mVnxkYp72uSvA8A3L3y')

const txAanalyzer = require('./tx_analyzer')
const walletMannager = require('./walletManager')
const alchemyApi = require('./alchemy_api')
const birdApi = require('./bird_api')

if(process.env.SERVER_TYPE == 'step02') {
  PriceUpdaterInstance.start()
}

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

// const https = require('https');
// const fs = require('fs');
// const path = require('path');
// const privateKeyPath = path.resolve(__dirname, 'privatekey.pem');
// const certificatePath = path.resolve(__dirname, 'certificate.pem');
// const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
// const certificate = fs.readFileSync(certificatePath, 'utf8');
// const httpsServer = https.createServer({
//   key: privateKey,
//   cert: certificate,
// }, app);
// const PORT = 443; // Default port for HTTPS
// httpsServer.listen(PORT, () => {
//   console.log(`HTTPS Server is running on port ${PORT}`);
// });

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
  if(rankSize > 1000) rankSize = 1000
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
  if(rankSize > 1000) rankSize = 1000
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
  if(rankSize > 1000) rankSize = 1000
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

app.get('/api/getLpburn', (req, res) => {  
  alchemyApi.getLpburn(req.query.token)
  res.send(
    {
      result: 0
    }
  )  
})

app.get('/api/findAlertingTokens', (req, res) => {
  let buyTxns = parseInt(req.query.buyTxns)
  let holders = parseInt(req.query.holders)
  txAanalyzer.findAlertingTokens(buyTxns, holders)
  .then(result => {
    res.send(result)
  })
  .catch(err => {
    res.send({
      result: 1,
      error: err
    })
  })
})

app.get('/api/addSmartWallet', (req, res) => {  
  walletMannager.addWallet(req.query.address, req.query.type)
  .then(wallets => {
    res.send(wallets)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/deleteSmartWallet', (req, res) => {  
  walletMannager.deleteWallet(req.query.address, req.query.type)
  .then(wallets => {
    res.send(wallets)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/listSmartWallet', (req, res) => {  
  walletMannager.listWallet(req.query.type)
  .then(wallets => {
    res.send(wallets)
  })
  .catch(err => {
    res.send([])
  })
})

app.post('/api/updateSmartWallets', (req, res) => {
  const {wallets, type} = req.body
  console.log('wallets:'); console.log(wallets)
  console.log('type = ' + type)
  walletMannager.updateWallets(wallets, type)
  .then(wallets => {
    res.send(wallets)
  })
  .catch(err => {
    res.send([])
  })
})

app.get('/api/tokenAlerts', (req, res) => {
  let offset = parseInt(req.query.offset)
  let limit = parseInt(req.query.limit)
  let type = parseInt(req.query.type)
  if(!offset) offset = 0
  if(!limit) limit = 20
  if(!type) type = 0
  // res.send(birdApi.getTokenAlerts(offset, limit, type))
  birdApi.getTokenAlerts(offset, limit, type, false)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send({
      result: 0,
      total: 0,
      alerts: []
    })
  })
})

app.get('/api/tokenAlertsForExport', (req, res) => {
  let start = Date.now() - 3600000 * 24
  let end = Date.now()
  try {
    start = new Date(req.query.start).getTime()
    end = new Date(req.query.end).getTime()    
  } catch (error) {
    
  }
  let type = parseInt(req.query.type)
  if(!type) type = 0
  console.log('start = ' + start)
  console.log('end = ' + end)
  birdApi.getTokenAlerts(start, end, type, true)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send({
      result: 0,
      total: 0,
      alerts: []
    })
  })
})

app.get('/api/walletAlerts', (req, res) => {
  let offset = parseInt(req.query.offset)
  let limit = parseInt(req.query.limit)
  let type = parseInt(req.query.type)
  if(!offset) offset = 0
  if(!limit) limit = 20
  if(!type) type = 0
  // res.send(birdApi.getWalletAlerts(offset, limit, type))
  birdApi.getWalletAlerts(offset, limit, type, false)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send({
      result: 0,
      total: 0,
      alerts: []
    })
  })
})

app.get('/api/walletAlertsForExport', (req, res) => {
  let start = Date.now() - 3600000 * 24
  let end = Date.now()
  try {
    start = new Date(req.query.start).getTime()
    end = new Date(req.query.end).getTime()    
  } catch (error) {
    
  }
  let type = parseInt(req.query.type)
  if(!type) type = 0
  console.log('start = ' + start)
  console.log('end = ' + end)
  birdApi.getWalletAlerts(start, end, type, true)
  .then(records => {
    res.send(records)
  })
  .catch(err => {
    res.send({
      result: 0,
      total: 0,
      alerts: []
    })
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
