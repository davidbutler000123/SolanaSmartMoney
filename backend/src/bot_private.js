import * as instance from './bot.js'
import * as utils from './bot_utils.js'

import assert from 'assert'
import dotenv from 'dotenv'

dotenv.config()

/*

start - welcome
login - get subscription
currentsettings - displays the settings
setsettings - update the settings
topgainer - displays top gainers
cancel - cancels subscription and logout

*/
const getWelcomeMessage = () => {

	const WELCOME_MESSAGE = `
🤖 Welcome to the Wallet Alert Bot!

🔗 Wallet Alert bot starting...`
	return WELCOME_MESSAGE;
}

function sendLoginMessage(chatid) {
	instance.sendMessage(chatid, `Please login">here</a>`)
}

export const procMessage = async (message, walletManager) => {

	let chatid = message.chat.id.toString();
	let session = instance.sessions.get(chatid)
	let userName = message?.chat?.username;

	if (message.photo) {
		console.log(message.photo)
	}

	if (message.animation) {
		console.log(message.animation)
	}

	if (!message.text)
		return;

	let command = message.text;
	if (message.entities) {
		for (const entity of message.entities) {
			if (entity.type === 'bot_command') {
				command = command.substring(entity.offset, entity.offset + entity.length);
				break;
			}
		}
	}

	if (command.startsWith('/')) {

		if (!session) {

			if (!userName) {
				console.log(`Rejected anonymous incoming connection. chatid = ${chatid}`);
				instance.sendMessage(chatid, `Welcome to alphAI bot. We noticed that your telegram does not have a username. Please create username and try again. If you have any questions, feel free to ask the developer team at @Hiccupwalter. Thank you.`)
				return;
			}

			if (false && !await instance.checkWhitelist(userName)) {

				//instance.sendMessage(chatid, `😇Sorry, but you do not have permission to use alphBot. If you would like to use this bot, please contact the developer team at ${process.env.TEAM_TELEGRAM}. Thanks!`);
				console.log(`Rejected anonymous incoming connection. @${userName}, ${chatid}`);
				return;
			}

			console.log(`@${userName} session has been permitted through whitelist`);
			
			session = instance.createSession(chatid, userName, 'private');
			session.permit = 1;

		}
		else {
		
		}

		let params = message.text.split(' ');
		if (params.length > 0 && params[0] === command) {
			params.shift()
		}

		command = command.slice(1);
		if (command === instance.COMMAND_START) {
			
			instance.setBotStart(true)
			instance.sendMessage(chatid, getWelcomeMessage())

			instance.stateMap_set(chatid, instance.STATE_IDLE, { sessionId: chatid })

		} else if (command === instance.COMMAND_CANCEL) {
			
			instance.setBotStart(false)

			instance.sendMessage(chatid, `✅ Successfully Alert Bot has been canceled`)

			instance.stateMap_set(chatid, instance.STATE_IDLE, { sessionId: chatid })

		} 
		else if (command === instance.COMMAND_SINGLE_LIST) {
			
			let wallets = null
			wallets = await walletManager.listWallet('single')

			let msg = `✅ Single Wallet list!`

			let walletList = '\n';
			for(let i = 0; i < wallets.length; i++)
				walletList = walletList + `${wallets[i].address}\n`

			msg = msg + walletList

			console.log("single list = " + msg)

			instance.sendMessage(chatid, msg)

			instance.stateMap_set(chatid, instance.STATE_IDLE, { sessionId: chatid })
			
		} else if (command === instance.COMMAND_SINGLE_ADD) {

			const SETTING_MESSAGE = `Please add single wallet address...`;
			
			instance.sendMessage(chatid, SETTING_MESSAGE)

			instance.stateMap_set(chatid, instance.STATE_WAIT_SINGLE_WALLET_ADD, { sessionId: chatid })

		} else if (command === instance.COMMAND_SINGLE_UPDATE) {
			
			const SETTING_MESSAGE = `Please update single wallet address`;

			instance.sendMessage(chatid, SETTING_MESSAGE)

			instance.stateMap_set(chatid, instance.STATE_WAIT_SINGLE_WALLET_UPDATE, { sessionId: chatid })

		} else if (command === instance.COMMAND_SINGLE_DELETE) {
			
			const msg = `Please delete single wallet address`
			instance.sendMessage(chatid, msg)
			instance.stateMap_set(chatid, instance.STATE_WAIT_SINGLE_WALLET_DELETE, { sessionId: chatid })

		} else if (command === instance.COMMAND_GROUP_ADD) {
			
			const msg = `Please add group wallet address`
			instance.sendMessage(chatid, msg)
			instance.stateMap_set(chatid, instance.STATE_WAIT_GROUP_WALLET_ADD, { sessionId: chatid })
			
			
		} else if (command === instance.COMMAND_GROUP_LIST) {			
			
			let wallets = null
			wallets = await walletManager.listWallet('group')

			let msg = `✅ Group Wallet list!`

			let walletList = '\n';
			for(let i = 0; i < wallets.length; i++)
				walletList = walletList + `${wallets[i].address}\n`

			msg = msg + walletList

			console.log("group list = " + msg)

			instance.sendMessage(chatid, msg)

			instance.stateMap_set(chatid, instance.STATE_IDLE, { sessionId: chatid })

		} else if (command === instance.COMMAND_GROUP_UPDATE) {

			const msg = `Please update group wallet address`
			instance.sendMessage(chatid, msg)
			instance.stateMap_set(chatid, instance.STATE_WAIT_GROUP_WALLET_UPDATE, { sessionId: chatid })

		} else if (command === instance.COMMAND_GROUP_DELETE) {

			const msg = `Please delete group wallet address`
			instance.sendMessage(chatid, msg)
			instance.stateMap_set(chatid, instance.STATE_WAIT_GROUP_WALLET_DELETE, { sessionId: chatid })
		} else {

			console.log(`Command Execute: /${command} ${params}`)
			if (instance._command_proc) {
				instance._command_proc(session, command, params)
			}
		}

		// instance.stateMap_remove(chatid)

	} else {
		processSettings(message, walletManager);
	}
}

const processSettings = async (msg, walletManager) => {

	const privateId = msg.chat?.id.toString()

	let stateNode = instance.stateMap_get(privateId)
	if (!stateNode)
		return
	if (stateNode.state === instance.STATE_WAIT_SINGLE_WALLET_ADD || stateNode.state === instance.STATE_WAIT_GROUP_WALLET_ADD) {
		const value = msg.text.trim()

		if (!utils.isValidWalletAddress(value)) {
			instance.sendMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again`)
			return
		}

		let wallets = null, mark = null
		if (stateNode.state === instance.STATE_WAIT_SINGLE_WALLET_ADD)
		{
			wallets = await walletManager.addWallet(value, 'single')
			mark = 'Single'
		}
		else
		{
			wallets = await walletManager.addWallet(value, 'group')
			mark = 'Group'
		}

		instance.sendMessage(privateId, `✅ ${mark} Wallet has been added`)

		instance.stateMap_set(privateId, instance.STATE_IDLE, { sessionId: stateNode.data.sessionId })
		return;
	} else if (stateNode.state === instance.STATE_WAIT_SINGLE_WALLET_LIST || stateNode.state === instance.STATE_WAIT_GROUP_WALLET_LIST) {
		
		let wallets = null, mark = null
		if (stateNode.state === instance.STATE_WAIT_SINGLE_WALLET_LIST)
		{
			wallets = await walletManager.listWallet('single')
			mark = 'Single'
		}	
		else
		{
			wallets = await walletManager.listWallet('group')
			mark = 'Group'
		}

		instance.sendMessage(privateId, `✅ ${mark} Wallet has been listed`)

		instance.stateMap_set(privateId, instance.STATE_IDLE, { sessionId: stateNode.data.sessionId })
		return;
	} else if (stateNode.state === instance.STATE_WAIT_SINGLE_WALLET_UPDATE || stateNode.state === instance.STATE_WAIT_GROUP_WALLET_UPDATE) {
		const value = msg.text.trim()

		const walletlist = value.split(',')
			
		let updatelist = []
		for(let i = 0; i < walletlist.length; i++)
		{
			const item = walletlist[i].trim()

			if (!utils.isValidWalletAddress(item)) {
				instance.sendMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again`)
				return
			}
			updatelist.push(item)			
		}

		console.log('update = ' + updatelist)
		
		let wallets = null
		let mark = null
		if (stateNode.state === instance.STATE_WAIT_SINGLE_WALLET_UPDATE){
			wallets = await walletManager.updateWallets(updatelist, 'single')
			mark = 'Single'
		}
		else
		{
			wallets = await walletManager.updateWallets(updatelist, 'group')
			mark = 'Group'
		}

		instance.sendMessage(privateId, `✅ ${mark} Wallet has been updated`)

		instance.stateMap_set(privateId, instance.STATE_IDLE, { sessionId: stateNode.data.sessionId })
		return;
	} else if (stateNode.state === instance.STATE_WAIT_SINGLE_WALLET_DELETE || stateNode.state === instance.STATE_WAIT_GROUP_WALLET_DELETE) {
		const value = msg.text.trim()
		console.log("single or group delete = " + value)

		if (!utils.isValidWalletAddress(value)) {
			instance.sendMessage(privateId, `🚫 Sorry, the address you entered is invalid. Please input again`)
			return
		}
		
		let wallets = null, mark;
		if (stateNode.state === instance.STATE_WAIT_SINGLE_WALLET_DELETE)
		{
			wallets = await walletManager.deleteWallet(value, 'single')
			mark = 'Single'
		}
		else
		{
			wallets = await walletManager.deleteWallet(value, 'group')
			mark = 'Group'
		}

		instance.sendMessage(privateId, `✅ ${mark} Wallet has been deleted`)

		instance.stateMap_set(privateId, instance.STATE_IDLE, { sessionId: stateNode.data.sessionId })
		return;
	}

}
