/*
	MainAppMenu.js
	--------------

	This file will provide a function that creates the main app menu for the app.
*/

// Electron
const { app, Menu, shell, ipcMain, BrowserWindow } = require('electron');
const Store = require('electron-store');
const store = new Store();

/**
 * Builds our main menus for the app
 * @param {BrowserWindow} mainWindow - main application window
 * @param {BrowserWindow} chatTesterWindow - chat tester window
 * @param {function} destroyAllWindows - function to destroy all windows
 */
function createAppMenu(mainWindow, chatTesterWindow, destroyAllWindows) {

	// true if we're in dev mode
	const isDev = process.env.NODE_ENV === 'development';

	// our main menu template
	const template = [
		{
			label: 'File',
			submenu: [
				{
					label: 'Quit',
					click: () => {
						destroyAllWindows();
						app.quit();
					}
				}
			]
		},
		{
			label: 'Edit',
			submenu: [
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ role: 'selectAll' }
			]
		},
		...((isDev) ? [{
			label: 'View',
			submenu: [
				{ role: 'reload' },
				{ role: 'forceReload' },
				{ role: 'toggleDevTools' },
				{ type: 'separator' },
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' }
			]
		}] : []),
		{
			label: 'Misc',
			submenu: [
				{
					label: 'Show Live Window',
					click: () => {
						const port = store.get('port', 3001);
						const url = isDev
							? 'http://localhost:8080/live.html'
							: `http://localhost:${port}/live/`;
						shell.openExternal(url);
					}
				},
				// {
				// 	label: 'Open Chat Tester',
				// 	click: () => {
				// 		chatTesterWindow.show();
				// 	}
				// }
			]
		},
		{
			label: 'Help',
			submenu: [
				{
					label: 'View Help',
					click: () => {
						mainWindow.webContents.send('show-help', 'help');
					}
				},
				{
					label: 'View Video Help',
					click: () => {
						mainWindow.webContents.send('show-help', 'help_videos');
					}
				},
				{ type: 'separator' },
				{
					label: 'Website',
					click: () => {
						shell.openExternal('http://chattoys.pro/');
					}
				},
				{
					label: 'GitHub',
					click: () => {
						shell.openExternal('https://github.com/orokro/Chat-Toys');
					}
				},
				{ type: 'separator' },
				{
					label: 'Contact',
					click: () => {
						mainWindow.webContents.send('show-help', 'help_contact');
					}
				},
				{
					label: 'Credits',
					click: () => {
						mainWindow.webContents.send('show-help', 'credits');
					}
				},
			]
		}
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

// stupid dumb module.exports 
module.exports = { createAppMenu };
