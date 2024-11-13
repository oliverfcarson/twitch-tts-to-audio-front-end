const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'renderer.js'), // Enable renderer script
            contextIsolation: false,
            nodeIntegration: true,
        }
    });

    mainWindow.loadFile('index.html');
    //mainWindow.webContents.openDevTools(); // Optional: Open DevTools for debugging
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
