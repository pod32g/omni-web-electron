/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import { app, BrowserWindow, ipcMain, shell, BrowserView } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import squirrelStartup from 'electron-squirrel-startup';

const RESERVED = { header: 48, sidebar: 260 };
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store webview instances
const webviews = new Map<string, BrowserView>();

if (process.platform === 'win32') {
  app.setAppUserModelId(app.getName());
}

if (squirrelStartup) {
  app.quit();
}

function layoutAll(mainWindow: BrowserWindow) {
  const b = mainWindow.getBounds();
  const rect = {
    x: RESERVED.sidebar,
    y: RESERVED.header,
    width: Math.max(200, b.width - RESERVED.sidebar),
    height: Math.max(200, b.height - RESERVED.header),
  };
  webviews.forEach((v) => {
    v.setBounds(rect);
    v.setAutoResize({ width: true, height: true });
  });
}

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Omni Electron',
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const pageUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
  if (pageUrl) {
    await mainWindow.loadURL(pageUrl);
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

app.whenReady().then(() => {
  ipcMain.handle('app:get-version', () => app.getVersion());
  
  // Webview handlers
  ipcMain.handle('view:create', async (event, { id, partition }: { id: string; partition?: string }) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return;
    
    const webview = new BrowserView({
      webPreferences: {
        partition: partition || 'default',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    
    webviews.set(id, webview);
    mainWindow.addBrowserView(webview);
    layoutAll(mainWindow);
  });
  
  ipcMain.handle('view:load', async (event, { id, url }: { id: string; url: string }) => {
    const webview = webviews.get(id);
    if (webview) {
      await webview.webContents.loadURL(url);
    }
  });
  
  ipcMain.on('view:set-bounds', (event, { id, bounds }: { id: string; bounds: { x: number; y: number; width: number; height: number } }) => {
    const webview = webviews.get(id);
    if (webview) {
      webview.setBounds(bounds);
    }
  });
  
  ipcMain.handle('view:destroy', async (event, { id }: { id: string }) => {
    const webview = webviews.get(id);
    if (webview) {
      const mainWindow = BrowserWindow.fromWebContents(event.sender);
      if (mainWindow) {
        mainWindow.removeBrowserView(webview);
      }
      (webview.webContents as any).destroy();
      webviews.delete(id);
    }
  });

  createWindow().catch((error) => {
    console.error('Failed to create window', error);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  ipcMain.removeHandler('app:get-version');
  ipcMain.removeHandler('view:create');
  ipcMain.removeHandler('view:load');
  ipcMain.removeHandler('view:destroy');
  ipcMain.removeAllListeners('view:set-bounds');
});
