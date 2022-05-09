/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs from 'fs';

import { resolveHtmlPath } from './util';
import EVENTS from '../constants/events';
import DB_CONSTANTS from '../constants/db.constants';
import TaxProcessor from './processor';

const sqlite3 = require('sqlite3');

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let mainProcessor: TaxProcessor | null = null;

const userDataFolder = app.getPath('userData');

const dbFolderPath = path.join(userDataFolder, DB_CONSTANTS.DB_FOLDER_NAME);
const dbFilePath = path.join(
  userDataFolder,
  DB_CONSTANTS.DB_FOLDER_NAME,
  DB_CONSTANTS.DB_NAME
);

if (!fs.existsSync(dbFolderPath)) {
  fs.mkdirSync(dbFolderPath);
}
if (!fs.existsSync(dbFilePath)) {
  const fd = fs.openSync(dbFilePath, 'w');
  fs.closeSync(fd);
}

const db = new sqlite3.Database(dbFilePath);

db.serialize(() => {
  db.run(
    'CREATE TABLE IF NOT EXISTS process_data (id INTEGER PRIMARY KEY, recpgstin TEXT, suppgstin TEXT, process_id TEXT, suppname TEXT, igst REAL, cgst REAL, sgst REAL, cess REAL, taxable REAL,  month INTEGER, year INTEGER, invoicedate TEXT, invoicevalue REAL, invoiceno TEXT)'
  );
});
db.close();

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.setMenu(null);

  mainProcessor = new TaxProcessor(mainWindow);

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  ipcMain.on(EVENTS.OPEN_SOURCE_CHOOSER, async (event, args) => {
    if (mainWindow) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
      });
      event.reply(EVENTS.OPEN_SOURCE_CHOOSER_RESULT, result);
    }
  });
  ipcMain.on(EVENTS.OPEN_DESTINATION_CHOOSER, async (event, args) => {
    if (mainWindow) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
      });
      event.reply(EVENTS.OPEN_DESTINATION_CHOOSER_RESULT, result);
    }
  });
  ipcMain.on(EVENTS.START_PROCESSING, async (event, args) => {
    mainProcessor?.startProcessing(args[0], args[1]);
  });
  ipcMain.on(EVENTS.CANCEL_PROCESSING, async (event, args) => {
    mainProcessor?.stopProcessing();
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
