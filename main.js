'use strict';
const path = require('path')
const electron = require('electron')
const url = require('url');
const pug = require('pug');
const fs = require('fs');
const os = require('os');
const mime = require('mime');

const config = require('./config.json');

const { app, protocol, BrowserWindow } = require('electron');

const locals = {};

var mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({ width: 1068, height: 610, resizable: true, autoHideMenuBar: true })
    mainWindow.setMenu(null);

    if (config.mode == "debug") {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.pug'),
        protocol: 'pug',
        slashes: true
    }))

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

app.on('ready', function() {

    protocol.registerBufferProtocol('pug', function(request, callback) {
        let parsedUrl = require('url').parse(request.url);
        var url = path.normalize(request.url.replace(os.type() == 'Windows_NT' ? 'pug:///' : 'pug://', '')).replace(/\?.*/g, "");
        let ext = path.extname(url);

        switch (ext) {
            case '.pug':
                var content = pug.renderFile(url);

                callback({
                    mimeType: 'text/html',
                    data: new Buffer.from(content)
                });
                break;

            default:
                let output = fs.readFileSync(url);

                return callback({ data: output, mimeType: mime.getType(ext) });
        }

    });

    createWindow();

});


app.on('window-all-closed', () => {

    app.quit()

})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})