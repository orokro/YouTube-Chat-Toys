/*
	Server.js
	---------

	When the main Electron process starts, we want to set up two Servers:
	- one for http requests for the live page to show in OBS
	- one for WebSocket connections to the live page

	This file will export a class we can initialize in main.js to set up these servers,
	and provide some logic for interacting with the UI via IPC.
*/

// node imports
import { app } from 'electron';
import { join } from 'path';
import express from 'express';
import http from 'http';
const { socketRefServer } = require('socket-ref/server');
const serveIndex = require('serve-index');
import cors from 'cors';

/**
 * Class to set up the servers for the live page.
 */
class OBSViewServer {

	/**
	 * Create a new OBSViewServer.
	 * 
	 * @param {BrowserWindow} mainWindow - The main window for the app.
	 */
	constructor(mainWindow) {

		// save ref to our main window
		this.mainWindow = mainWindow;
		
		// start our servers
		this.startServers();
	}


	/**
	 * Starts the echo server.
	 */
	startEchoServer(){

		// note that, WSS comes from the socket-ref server
		// and is already set up to handle incoming messages
		this.wss.on('connection', (socket) => {

			// when we get a message, parse it and forward it to the renderer
			socket.on('message', (data) => {
				let msg;

				try {
					msg = JSON.parse(data);
				} catch (err) {
					return; // ignore non-JSON messages
				}

				if (msg.type === 'echo' && msg.data !== undefined) {
					socket.send(`Echo: ${msg.data}`);
				}
			});
		});
	}


	/**
	 * Starts both the http and websocket servers.
	 */
	startServers(){

		// try to start the servers
		try {

			// set up a basic express server and a WebSocket server
			const expressApp = express();
			const server = http.createServer(expressApp);

			// using our socket-ref server, that syncs socketRefs
			this.wss = socketRefServer({ server });
			this.startEchoServer();

			// 👇 Allow CORS for Vite dev server ONLY in development
			if (true || process.env.NODE_ENV === 'development') {
				expressApp.use(cors({
				origin: 'http://localhost:8080',
				methods: ['GET', 'POST'],
				credentials: true
				}));
			}

			// Serve /live.html in production
			if (true || process.env.NODE_ENV !== 'development') {
	
				// path to our electron renderer folder where BOTH the electron UI lives,
				// but ALSO the live page we're about to server to OBS via express
				const rendererPath = join(app.getAppPath(), 'renderer');
	
				// Block direct access to index.html
				expressApp.use('/live/index.html', (req, res) => {
					console.warn(`Blocked attempt to access: ${req.url}`);
					res.status(403).send('Access to this file is forbidden');
				});
	
				// Serve live.html manually when accessing /live/
				expressApp.get('/live/', (req, res) => {
					res.sendFile('live.html', { root: rendererPath });
				});
	
				// Serve static assets, but disable default index.html serving
				expressApp.use('/live', express.static(rendererPath, {
					index: false,
				}));

				// our custom imported user-assets folder needs to statically serve as well
				const assetFolder = join(app.getPath('userData'), 'custom_assets');
				expressApp.use('/live/custom_assets',
					express.static(assetFolder),
					serveIndex(assetFolder, { icons: true })
				);


			}
	
			// Example WebSocket echo
			// wss.on('connection', (socket) => {
			// 	console.log('WebSocket connected');
			// 	socket.on('message', (msg) => {
			// 		console.log('Received:', msg);
			// 		socket.send(`Echo: ${msg}`);
			// 	});
			// });
	
			server.listen(3001, () => {
				console.log('Server listening at http://127.0.0.1:3001');
			});
	
		}catch(e){
			console.error(e);
		}
	}

}


// stupid dumb module.exports
module.exports = { OBSViewServer };
