/*
	CommandProcessor.js
	-------------------

	Handles the commands we get from live chat.
*/

// vue
import { computed, watch } from 'vue';
import { ChatProcessor } from "./ChatProcessor";
import ChatToysApp from "./ChatToysApp";

/**
 * CommandProcessor class
 */
export class CommandProcessor {

	/**
	 * Builds the command Processor
	 * 
	 * @param {ChatToysApp} chatToysApp - The main ChatToysApp object
	 * @param {ChatProcessor} chatProcessor - The ChatProcessor object
	 * @param {UserManager} userManager - The UserManager object
	 */
	constructor(chatToysApp, chatProcessor, userManager) {

		// save our app / references
		this.chatToysApp = chatToysApp;
		this.chatProcessor = chatProcessor;
		this.userManager = userManager;
		this.commandsRef = this.chatToysApp.commands

		// build a map of commands for easy lookup
		this.commandMap = {};
		this.buildCommandMap();

		// out map of listeners based on toySlugs
		this.toyHooks = new Map();

		// true when we have 'channel_points' enabled
		this.enableCosts = computed(()=>
			this.chatToysApp.enabledToys.value.includes('channel_points'));

		// maps of timestamps for user cooldowns
		this.userCooldowns = new Map();
		this.groupCooldowns = new Map();

		// list of callbacks for when any command is detected
		this.commandCallbacks = [];

		// set up our listeners / watchers
		this.subscribeEvents();
	}


	/**
	 * Add a callback to run when a command is found
	 * 
	 * @param {Function} callback - Callback to run when a command is found
	 */
	onCommandFound(callback) {
		this.commandCallbacks.push(callback);
	}


	/**
	 * Subscribe to events and set up vue watchers
	 */
	subscribeEvents() {

		// whenever the commands change, rebuild the command map
		watch(this.commandsRef, ()=> this.buildCommandMap());

		// subscribe to the stream of new chat messages to check for commands
		this.chatProcessor.onNewChats((messages) => this.handleChats(messages));
	}


	/**
	 * Allow app to hook into one of the slugs for those commands
	 * 
	 * @param {String} toySlug - The toy slug to hook commands for, like "chat" or "tosser", etc
	 * @param {Function} callback - What to call when one of the matching commands is found
	 */
	hookToyCommands(toySlug, callback) {

		// add to list of call backs for this toySlug
		if (this.toyHooks.has(toySlug) == false)
			this.toyHooks.set(toySlug, []);
		this.toyHooks.get(toySlug).push(callback);
	}


	/**
	 * Build a map of commands for easy lookup
	 */
	buildCommandMap(){

		// build a map of commands for easy lookup
		// note: we need to run this every time this.commandsRef changes
		this.commandMap = Object.values(this.commandsRef.value).reduce((map, cmd) => {
			map[cmd.command] = cmd;
			return map;
		}, {});
	}


	/**
	 * Check incoming chat messages for commands
	 * 
	 * @param {Array<Object>} messages - Array of new messages to look for commands
	 */
	handleChats(messages) {

		const commandMap = this.commandMap;

		// loop through each message
		for (const msg of messages) {

			// get the message text and author
			const { messageText, authorUniqueID } = msg;

			// must contain and start with '!' to be a command
			if (messageText.startsWith('!') == false)
				continue;

			// split the message into parts, starting after the '!'
			const parts = messageText.slice(1).split(/\s+/);

			// if the first part is not a complete command, skip
			// or if the command is not enabled GTFO
			const commandKey = parts[0];
			const commandData = commandMap[commandKey];
			if (!commandData || !commandData.enabled)
				continue;

			// get potential params (not all commands have params)
			const params = this.parseParams(commandData, messageText);

			// get the user data from our data base
			const user = this.userManager.getUserByID(authorUniqueID);

			// make sure this command is able to be run
			if (this.validateCommand(commandData, user, params) == false)
				continue;

			// split the command slug into toy and command parts
			const [toySlug, commandSlug] = commandData.slug.split(/__/, 2);

			// notify all listeners of this command that was successfully run
			for (const cb of this.commandCallbacks)
				cb(commandSlug, msg, user, params);

			// if we don't have any listeners for this command, skip further processing
			if (this.toyHooks.has(toySlug) == false)
				continue;

			// notify all listeners of this command that was successfully run
			for (const cb of this.toyHooks.get(toySlug))
				cb(commandSlug, msg, user, params);

			// Update cooldowns
			const now = Date.now();
			this.userCooldowns.set(`${commandData.slug}:${user.id}`, now);
			this.groupCooldowns.set(commandData.slug, now);
		}
	}


	/**
	 * Parse the parameters from a command message
	 * 
	 * @param {Object} commandData - The command data object
	 * @param {String} messageText - The full message text
	 * @returns {Array<String>} - Array of parsed parameters
	 */
	parseParams(commandData, messageText) {

		// get the raw message text, trim it, and remove the command part
		// +2 for '!' and space
		const raw = messageText.trim().slice(commandData.command.length + 2); 
		const paramDefs = commandData.params || [];

		// if this command doesn't have any params, return an empty array
		if (paramDefs.length === 0) return [];

		// if this command only has one param, return the raw remainder of the message
		if (paramDefs.length === 1) return [raw];

		// If we got here, we have multiple params, so we need to parse them
		// some of them might be quoted, so we need to handle that
		const quoted = raw.match(/"(.*?)"|(\S+)/g) || [];
		const clean = quoted.map(str => str.replace(/(^"|"$)/g, ''));
		return clean;
	}


	/**
	 * Makes sure our command is able to be run
	 * 
	 * @param {Object} commandData - The command data object
	 * @param {Object} user - The user object
	 * @param {Array<String>} params - Optional parameters
	 * @returns {Boolean} - True if the command is valid and can be run
	 */
	validateCommand(commandData, user, params) {

		// if the command is not enabled, GTFO
		if (!commandData.enabled)
			return false;

		// gather some data we need
		const now = Date.now();
		const slug = commandData.slug;
		const userKey = `${slug}:${user.id}`;

		// Cooldowns
		if (commandData.coolDown) {

			// check if the time since the last time THIS user ran THIS command
			// is less than the cooldown time, if so, GTFO
			const last = this.userCooldowns.get(userKey);
			if (last && (now - last) < commandData.coolDown * 1000) {
				console.error('User cooldown not met');
				return false;
			}
		}

		// Group cooldown
		if (commandData.groupCoolDown) {

			// check if the time since the last time ANY user ran THIS command
			// is less than the cooldown time, if so, GTFO
			const last = this.groupCooldowns.get(slug);
			if (last && (now - last) < commandData.groupCoolDown * 1000) {
				console.error('Group cooldown not met');
				return false;
			}
		}

		// Cost check
		if (this.enableCosts.value==true){
			if(commandData.costEnabled && user.points < commandData.cost) {
				console.error('Not enough points');
				return false;
			}
		}

		// Param validation
		const paramDefs = commandData.params || [];
		if (params.length < paramDefs.filter(p => !p.optional).length) {
			console.error('Missing required parameters');
			return false;
		}

		// Check param types
		for (let i = 0; i < paramDefs.length; i++) {

			const def = paramDefs[i];
			const val = params[i];

			if (!val && !def.optional) {
				console.error(`Missing required param: ${def.name}`);
				return false;
			}

			if (def.type === 'number' && isNaN(parseFloat(val))) {
				console.error(`Invalid number for param: ${def.name}`);
				return false;
			}

		}// next i

		return true;
	}

}
