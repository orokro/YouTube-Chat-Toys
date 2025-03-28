/*
	ChatProcessor.js
	----------------

	Listens for incoming chat messages & processes them for display in the UI.
	and for future command processing.
*/

// vue
import { shallowRef } from 'vue';

/**
 * Class to process incoming chat messages
 */
export class ChatProcessor {

	/**
	 * Builds a new ChatProcessor
	 * 
	 * @param {Object} options - OPTIONAL; like { rollingIDListLength: 1000, displayCount: 10 }	
	 */
	constructor(options = {}) {

		// handle our optional options
		this.rollingIDListLength = options.rollingIDListLength || 1000;
		this.displayCount = options.displayCount || 10;

		// this will be used externally to render the chat messages if need be
		this.screenMessages = shallowRef([]);

		// keep track of seen messages so we don't repeat them
		this._seenMessageIDs = new Set();

		// callbacks for when new messages come in
		this._onNewChatsCallbacks = [];

		// Bind method for handling chat messages
		this._handleChatMessage = this._handleChatMessage.bind(this);

		// Hook up to Electron API
		window.electronAPI.onChatMessage(this._handleChatMessage);
	}


	/**
	 * Add a callback to run when new messages come in
	 * 
	 * @param {Function} callback - Callback to run when new messages come in
	 */
	onNewChats(callback) {
		this._onNewChatsCallbacks.push(callback);
	}


	/**
	 * Formats chat messages from the chat platform & triggers callbacks
	 * 
	 * @param {Object} data - Data from the chat platform
	 * @returns {Array<Object>} - Array of formatted chat messages
	 */
	_handleChatMessage(data) {

		// break out the top level object
		data = JSON.parse(data); //.responseContext;

		// check for the data we need
		if (
			!data?.continuationContents?.liveChatContinuation?.actions ||
			!Array.isArray(data.continuationContents.liveChatContinuation.actions)
		) return;

		// get the chat messages, which are stored as 'actions'
		// because originally they're intended to be things like 'addChatItemAction'
		const actions = data.continuationContents.liveChatContinuation.actions;

		// as we process the raw data, we'll populate this array with formatted messages (if any)
		const newMessages = [];

		// loop through the actions
		for (const action of actions) {

			// get the renderer
			const renderer = action?.addChatItemAction?.item?.liveChatTextMessageRenderer;
			if (!renderer)
				continue;

			// get the message ID
			const id = renderer.id;

			// if we've already seen this message, skip it
			if (this._seenMessageIDs.has(id))
				continue;

			// get the author, message, and timestamp, and whether they're a member
			const authorName = renderer.authorName?.simpleText || '';
			const authorChannelId = renderer.authorExternalChannelId || '';
			const timestampUsec = renderer.timestampUsec;
			const isMember = !!renderer.authorBadges?.some(
				(b) => b?.liveChatAuthorBadgeRenderer?.customThumbnail
			);

			// get the message text and emojis
			const runs = renderer.message?.runs || [];
			let messageText = '';
			const emojis = [];

			// loop through the runs to get the message text and emojis
			for (const run of runs) {

				if (run.text) {
					messageText += run.text;
				} else if (run.emoji) {
					const emoji = run.emoji;
					if (emoji.isCustomEmoji && emoji.image?.thumbnails?.length) {
						const url = emoji.image.thumbnails[emoji.image.thumbnails.length - 1].url;
						const shortcode = `&${emoji.shortcuts?.[0] || emoji.emojiId};`;
						messageText += shortcode;
						emojis.push(url);
					} else if (emoji.emojiId) {
						messageText += emoji.emojiId; // Unicode emoji
					}
				}

			}// next run

			// the final formatted message
			const formatted = {
				id,
				authorUniqueID: authorChannelId,
				author: authorName,
				messageText,
				emojis,
				time: timestampUsec ? Number(timestampUsec) : undefined,
				isMember,
			};

			// add it to our list & mark it as seen so we don't repeat it
			newMessages.push(formatted);
			this._markMessageAsSeen(id);

		}// next action

		if (newMessages.length > 0) {
			// Trigger callbacks
			this._onNewChatsCallbacks.forEach((cb) => cb(newMessages));

			// Update reactive screenMessages
			const updated = [...this.screenMessages.value, ...newMessages];
			this.screenMessages.value = updated.slice(-this.displayCount);
		}
	}


	/**
	 * Keep a list of seen message IDs, so we don't repeat them
	 * 
	 * @param {String} id - ID of a message
	 */
	_markMessageAsSeen(id) {

		// add the ID to our list
		this._seenMessageIDs.add(id);

		// if our list is too long, trim it
		if (this._seenMessageIDs.size > this.rollingIDListLength) {
			const ids = Array.from(this._seenMessageIDs);
			this._seenMessageIDs = new Set(ids.slice(-this.rollingIDListLength));
		}
	}

}
