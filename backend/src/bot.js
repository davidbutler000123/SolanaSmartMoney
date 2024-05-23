import TelegramBot from 'node-telegram-bot-api'
import assert from 'assert';
import dotenv from 'dotenv'
dotenv.config()

const walletManager = require('./walletManager')

import * as privateBot from './bot_private.js'
import exp from 'constants';
// import * as groupBot from './bot_group.js'
import * as utils from './bot_utils.js'

const token = process.env.BOT_TOKEN
export const bot = new TelegramBot(token,
	{
		polling: true,
	})

// export const myInfo = await bot.getMe();

export const sessions = new Map()
export const stateMap = new Map()

export const COMMAND_START = 'start'
export const COMMAND_CANCEL = 'cancel'

export const COMMAND_SINGLE_LIST = 'list'
export const COMMAND_SINGLE_ADD = 'add'
export const COMMAND_SINGLE_UPDATE = 'update'
export const COMMAND_SINGLE_DELETE = 'delete'

export const COMMAND_GROUP_LIST = 'grouplist'
export const COMMAND_GROUP_ADD = 'groupadd'
export const COMMAND_GROUP_UPDATE = 'groupupdate'
export const COMMAND_GROUP_DELETE = 'groupdelete'

export const OPTION_MAIN_SETTING = 0

export const OPTION_SET_SINGLE_WALLET_LIST 		= 1
export const OPTION_SET_SINGLE_WALLET_ADD 		= 2
export const OPTION_SET_SINGLE_WALLET_UPDATE 	= 3
export const OPTION_SET_SINGLE_WALLET_DELETE 	= 4

export const OPTION_SET_GROUP_WALLET_LIST 	= 5
export const OPTION_SET_GROUP_WALLET_ADD	= 6
export const OPTION_SET_GROUP_WALLET_UPDATE = 7
export const OPTION_SET_GROUP_WALLET_DELETE = 8

export const STATE_IDLE = 0
export const STATE_WAIT_SINGLE_WALLET_ADD = 100
export const STATE_WAIT_SINGLE_WALLET_LIST = 101
export const STATE_WAIT_SINGLE_WALLET_UPDATE = 102
export const STATE_WAIT_SINGLE_WALLET_DELETE = 103

export const STATE_WAIT_GROUP_WALLET_ADD = 104
export const STATE_WAIT_GROUP_WALLET_LIST = 105
export const STATE_WAIT_GROUP_WALLET_UPDATE = 106
export const STATE_WAIT_GROUP_WALLET_DELETE = 107


export const stateMap_set = (chatid, state, data = {}) => {
	stateMap.set(chatid, { state, data })
}

export const stateMap_get = (chatid) => {
	return stateMap.get(chatid)
}

export const stateMap_remove = (chatid) => {
	stateMap.delete(chatid)
}

export const stateMap_clear = () => {
	stateMap.clear()
}

export async function sendWalletData(tradedata, type) {

	// txHash: '3m5vyWedMZ1up3U8mTUTjF87GMwhdKgYWSXG3wH17NrYftTLYiXCy74pYKg2CcSjdbU4qY2pGw98QcGQDVy5278o',
	// token: 'G1rW8H6eDpR7eZBAqfkhW1xRaHEjPNkfhZB6jdtnQJj7',
	// symbol: 'MOGE',
	// owner: 'arsc4jbDnzaqcCLByyGo7fg7S2SmcFsWUzQuDtLZh2y',
	// side: 'buy',
	// solAmount: 1.76045207,
	// baseAmount: 3278937.360916,
	// createdAt: 1716373902941,
	// pool: {
	//   tokenName: 'Mogecoin',
	//   tokenSymbol: 'MOGE',
	//   fdvUsd: 78795,
	//   liquiditySol: 82.193,
	//   pairAddress: 'Heb9vh664PnrDviJNsUNZESD21R9kNYRk3AqY7fdD58u',
	//   pairCreatedAt: 1716373684000,
	//   pairLifeTimeMins: 3,
	//   dexUrl: 'https://dexscreener.com/solana/heb9vh664pnrdvijnsunzesd21r9knyrk3aqy7fdd58u',
	//   webSiteUrl: '',
	//   telegramUrl: '',
	//   twitterUrl: ''
	// 	 logoURI:
	// }

	const cur_time = new Date()			
	let timeStr = cur_time.toLocaleDateString() +" "+ cur_time.toLocaleTimeString()
	// let timeStr = utils.getTimeStringUTC(cur_time)

	const tokenAddress = tradedata['token']
	const tokenName = tradedata['pool']['tokenName']
	const tokenSymbol = tradedata['pool']['tokenSymbol']

	let solAmount = utils.get_amount(tradedata['solAmount'])

	const pairs = tradedata['pool']['pairAgeLabel'] // tradedata['pool']['pairLifeTimeMins']
	let fdvSol = utils.get_amount(tradedata['pool']['fdvSol'])
	let fdvUsd = utils.get_amount(tradedata['pool']['fdvUsd'])

	const wallet = utils.getShortenedAddress(tradedata['owner'])

	const telegramUrl = tradedata['pool']['telegramUrl']

	const twitterUrl = tradedata['pool']['twitterUrl']
	const webUrl = tradedata['pool']['webSiteUrl']
	const dexUrl = tradedata['pool']['dexUrl']

	const logURI = tradedata['pool']['logoURI']

	let bought_str = type ? `🎒 Bought ${solAmount} SOL `: '🎒 Bought by 5 wallets in the last hour '

	const NEW_MSG = `<a href="${dexUrl}">${tokenName}</a> (${tokenSymbol}) 
 
${bought_str}
			 
🧢 Wallet (${wallet}) 
			 
💵 Info  
Pairs: ${pairs} 
FDV:  ${fdvSol} Ξ (${fdvUsd}) 
			 
📄 CA 
<code>${tokenAddress}</code>
			 
${timeStr}  
			 
<a href="${telegramUrl}">Telegram</a> | <a href="${twitterUrl}">Twitter </a>`


	let chatid = process.env.CHAT_ID

	if (logURI)
		bot.sendPhoto(chatid, logURI, { caption: NEW_MSG, parse_mode: 'HTML', disable_web_page_preview: true }).catch((err) => {
			console.log('\x1b[31m%s\x1b[0m', `sendPhoto Error: ${chatid} ${err.response.body.description}`);
			console.log(tradedata)
		});
	else
		sendMessageSync(chatid, NEW_MSG)
}

export function sendMessage(chatid, message, enableLinkPreview = true) {
	try {

		let data = { parse_mode: 'HTML' }

		if (enableLinkPreview)
			data.disable_web_page_preview = false
		else
			data.disable_web_page_preview = true

		data.disable_forward = true

		bot.sendMessage(chatid, message, data)

		return true
	} catch (error) {
		console.log('sendMessage', error)

		return false
	}
}

export async function sendMessageSync(chatid, message, info = {}) {
	try {

		let data = { parse_mode: 'HTML' }

		data.disable_web_page_preview = false
		data.disable_forward = true

		await bot.sendMessage(chatid, message, data)

		return true
	} catch (error) {

		if (error?.response?.body?.error_code === 403) {
			info.blocked = true
		}

		console.log(error?.response?.body)
		console.log('sendMessage', error)

		return false
	}
}

export async function sendPhoto(chatid, file_id, message) {
	bot.sendPhoto(chatid, file_id, { caption: message, parse_mode: 'HTML', disable_web_page_preview: true }).catch((err) => {
		console.log('\x1b[31m%s\x1b[0m', `sendPhoto Error: ${chatid} ${err.response.body.description}`);
	});
}

export function showSessionLog(session) {

	if (session.type === 'private') {
		console.log(`@${session.username} user${session.wallet ? ' joined' : '\'s session has been created (' + session.chatid + ')'}`)
	} else if (session.type === 'group') {
		console.log(`@${session.username} group${session.wallet ? ' joined' : '\'s session has been created (' + session.chatid + ')'}`)
	} else if (session.type === 'channel') {
		console.log(`@${session.username} channel${session.wallet ? ' joined' : '\'s session has been created'}`)
	}
}

export const createSession = (chatid, username, type) => {

	let session = {
		chatid: chatid,
		username: username,		
		wallet: null,
		permit: 0,
		type: type
	}

	setDefaultSettings(session)

	sessions.set(session.chatid, session)
	showSessionLog(session)

	return session;
}

export const updateSession = async (user) => {
	let session = sessions.get(user.chatid);
	if (session) {
		session.chatid = user.chatid
		session.username = user.username
		session.wallet = user.wallet;
		session.type = user.type;	
	}
}

export const setDefaultSettings = (session) => {

}

export let bot_start = false

export const setBotStart = async (bStart) =>{
	bot_start = bStart
}

bot.on('message', async (message) => {

	// console.log(`========== message ==========`)
	// console.log(message)
	// console.log(`=============================`)

	const msgType = message?.chat?.type;
	console.log("AAA --> ", message.text);

	if (msgType === 'private') {

		privateBot.procMessage(message, walletManager);
		

	} else if (msgType === 'group' || msgType === 'supergroup') {
		// groupBot.procMessage(message, database);

	} else if (msgType === 'channel') {

	}
})

bot.on('callback_query', async (callbackQuery) => {
	// console.log('========== callback query ==========')
	// console.log(callbackQuery)
	// console.log('====================================')

	const message = callbackQuery.message;

	if (!message) {
		return
	}

	const option = JSON.parse(callbackQuery.data);
	let chatid = message.chat.id.toString();

	const cmd = option.c;
	const id = option.k;

	// executeCommand(chatid, message.message_id, callbackQuery.id, option)
})

// const executeCommand = async (chatid, messageId, callbackQueryId, option) => {

// 	const cmd = option.c;
// 	const id = option.k;

// 	//stateMap_clear();

// 	try {

// 		// if (cmd == OPTION_SET_SINGLE_WALLET_ADD) {
// 		// 	const sessionId = id;
// 		// 	assert(sessionId)

// 		// 	// const msg = `Input token address (0x....)`
// 		// 	const msg = `Please send a token address for volume market making.(0x....)`
// 		// 	sendMessage(chatid, msg)
// 		// 	await bot.answerCallbackQuery(callbackQueryId, { text: msg })
// 		// 	stateMap_set(chatid, SIMULATION_WAIT_TOKEN_ADDRESS, { sessionId })
// 		// } else if (cmd == OPTION_SET_SINGLE_WALLET_LIST) {
// 		// 	const sessionId = id;
// 		// 	assert(sessionId)

// 		// 	const msg = `Please send a wallet address for withdraw ETH.(0x....)`
// 		// 	sendMessage(chatid, msg)
// 		// 	await bot.answerCallbackQuery(callbackQueryId, { text: msg })
// 		// 	stateMap_set(chatid, STATE_WAIT_WITHDRAW_ADDRESS, { sessionId })
// 		// } else if (cmd == OPTION_SET_SINGLE_WALLET_DELETE) {
// 		// 	const sessionId = id;
// 		// 	assert(sessionId)

// 		// 	const msg = `Input end date (M/d/Y)`
// 		// 	sendMessage(chatid, msg)
// 		// 	await bot.answerCallbackQuery(callbackQueryId, { text: msg })
// 		// 	stateMap_set(chatid, SIMULATION_WAIT_END_DATE, { sessionId })
// 		// } else if (cmd == SIMULATION_SET_START_DATE) {
// 		// 	const sessionId = id;
// 		// 	assert(sessionId)

// 		// 	const msg = `Input start date (M/d/Y)`
// 		// 	sendMessage(chatid, msg)
// 		// 	await bot.answerCallbackQuery(callbackQueryId, { text: msg })
// 		// 	stateMap_set(chatid, SIMULATION_WAIT_START_DATE, { sessionId })
// 		// }
// 	} catch (error) {
		
// 		sendMessage(chatid, `😢 Sorry, there was some errors on the command. Please try again later 😉`)
// 		await bot.answerCallbackQuery(callbackQueryId, { text: `😢 Sorry, there was some errors on the command. Please try again later 😉` })
// 	}
// }

// module.exports = {
// 	sendPhoto,
// 	sendMessage,
// 	sendMessageSync
// }