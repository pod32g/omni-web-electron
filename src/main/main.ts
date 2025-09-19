/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

import { app, BrowserWindow, BrowserView, ipcMain, shell } from 'electron'
import type { WebContents } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import squirrelStartup from 'electron-squirrel-startup'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type WebviewEntry = {
  view: BrowserView
  owner: WebContents
  dispose: () => void
  sendLoadingState: (isLoading: boolean) => void
  sendPageInfo: (info?: { url?: string; title?: string }) => void
}

const webviews = new Map<string, WebviewEntry>()

if (process.platform === 'win32') {
  app.setAppUserModelId(app.getName())
}

if (squirrelStartup) {
  app.quit()
}

process.on('uncaughtException', (error) => {
  console.error('Main: Uncaught exception', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Main: Unhandled rejection', { reason, promise })
})

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
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const emitMaximizeChange = () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized-change', mainWindow.isMaximized())
    }
  }

  mainWindow.on('maximize', emitMaximizeChange)
  mainWindow.on('unmaximize', emitMaximizeChange)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  const pageUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL
  if (pageUrl) {
    await mainWindow.loadURL(pageUrl)
  } else {
    await mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

const registerWindowIpc = () => {
  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      return
    }
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })
}

const registerWebviewIpc = () => {
  console.log('Main: Registering webview IPC handlers...')

  ipcMain.handle('view:create', async (event, { id, partition }: { id: string; partition?: string }) => {
    if (webviews.has(id)) {
      console.log('Main: Webview already exists, skipping creation', { id })
      return
    }

    const owner = event.sender
    const mainWindow = BrowserWindow.fromWebContents(owner)
    if (!mainWindow) {
      console.error('Main: No BrowserWindow found for view:create', { id })
      return
    }

    const view = new BrowserView({
      webPreferences: {
        partition: partition ?? 'default',
        contextIsolation: false,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    const sendLoadingState = (isLoading: boolean) => {
      try {
        if (!owner.isDestroyed()) {
          owner.send('view:loading-state', { id, isLoading })
        }
      } catch (error) {
        console.error('Main: Failed to send loading state', { id, error })
      }
    }

    const sendPageInfo = (info: { url?: string; title?: string } = {}) => {
      try {
        if (owner.isDestroyed() || view.webContents.isDestroyed()) {
          return
        }
        const currentUrl = info.url ?? view.webContents.getURL()
        if (!currentUrl || currentUrl === 'about:blank') {
          return
        }
        const currentTitle = info.title ?? view.webContents.getTitle()
        owner.send('view:page-info', { id, url: currentUrl, title: currentTitle || currentUrl })
      } catch (error) {
        console.error('Main: Failed to send page info', { id, error })
      }
    }

    const { webContents } = view
    const didStartLoading = () => sendLoadingState(true)
    const didStopLoading = () => {
      sendLoadingState(false)
      sendPageInfo()
    }
    const didFailLoad = (_event: unknown, errorCode: number, errorDescription: string, validatedURL: string) => {
      if (errorCode !== -3) {
        console.error('Main: BrowserView failed to load', { id, errorCode, errorDescription, validatedURL })
      }
      sendLoadingState(false)
      if (validatedURL) {
        sendPageInfo({ url: validatedURL })
      }
    }
    const handlePageTitleUpdated = (_event: unknown, title: string) => sendPageInfo({ title })
    const handleDidNavigate = (_event: unknown, url: string) => sendPageInfo({ url })
    const handleDidNavigateInPage = (_event: unknown, url: string) => sendPageInfo({ url })

    webContents.on('did-start-loading', didStartLoading)
    webContents.on('did-stop-loading', didStopLoading)
    webContents.on('did-fail-load', didFailLoad)
    webContents.on('page-title-updated', handlePageTitleUpdated)
    webContents.on('did-navigate', handleDidNavigate)
    webContents.on('did-navigate-in-page', handleDidNavigateInPage)

    const dispose = () => {
      webContents.removeListener('did-start-loading', didStartLoading)
      webContents.removeListener('did-stop-loading', didStopLoading)
      webContents.removeListener('did-fail-load', didFailLoad)
      webContents.removeListener('page-title-updated', handlePageTitleUpdated)
      webContents.removeListener('did-navigate', handleDidNavigate)
      webContents.removeListener('did-navigate-in-page', handleDidNavigateInPage)
    }

    webviews.set(id, { view, owner, dispose, sendLoadingState, sendPageInfo })

    try {
      mainWindow.addBrowserView(view)
      view.setAutoResize({ width: true, height: true })
      sendLoadingState(false)
      sendPageInfo()
    } catch (error) {
      console.error('Main: Failed to attach BrowserView', { id, error })
      dispose()
      view.webContents.destroy()
      webviews.delete(id)
      throw error
    }
  })

  ipcMain.handle('view:load', async (_event, { id, url }: { id: string; url: string }) => {
    const entry = webviews.get(id)
    if (!entry) {
      console.error('Main: No webview entry for view:load', { id })
      return
    }

    entry.sendLoadingState(true)
    try {
      await entry.view.webContents.loadURL(url)
      entry.sendPageInfo({ url })
    } catch (error: unknown) {
      const navigationError = error as { code?: number; errno?: number } | undefined
      if (navigationError?.code === -3 || navigationError?.errno === -3) {
        console.log('Main: Navigation aborted (normal)', { id, url })
      } else {
        console.error('Main: Failed to load URL', { id, url, error })
      }
      entry.sendLoadingState(false)
      entry.sendPageInfo({ url })
    }
  })

  ipcMain.on('view:set-bounds', (_event, { id, bounds }: { id: string; bounds: { x: number; y: number; width: number; height: number } }) => {
    const entry = webviews.get(id)
    if (entry) {
      entry.view.setBounds(bounds)
    }
  })

  ipcMain.handle('view:set-ignore-mouse-events', (_event, { id, ignore, forward }: { id: string; ignore: boolean; forward?: boolean }) => {
    const entry = webviews.get(id)
    if (!entry) {
      console.error('Main: No webview entry for view:set-ignore-mouse-events', { id })
      return
    }

    try {
      if (ignore) {
        entry.view.setIgnoreMouseEvents(true, { forward: forward ?? true })
      } else {
        entry.view.setIgnoreMouseEvents(false)
      }
    } catch (error) {
      console.error('Main: Failed to toggle ignore mouse events', { id, ignore, forward, error })
    }
  })

  ipcMain.handle('view:destroy', (event, { id }: { id: string }) => {
    const entry = webviews.get(id)
    if (!entry) {
      return
    }

    try {
      const mainWindow = BrowserWindow.fromWebContents(event.sender)
      if (mainWindow) {
        mainWindow.removeBrowserView(entry.view)
      }
      entry.dispose()
      entry.sendLoadingState(false)
      entry.view.webContents.destroy()
    } finally {
      webviews.delete(id)
    }
  })
}

const registerCoreIpc = () => {
  ipcMain.handle('app:get-version', () => app.getVersion())
}

const registerIpcHandlers = () => {
  registerCoreIpc()
  registerWindowIpc()
  registerWebviewIpc()
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
}).catch((error) => {
  console.error('Main: Failed during startup', error)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  ipcMain.removeHandler('app:get-version')
  ipcMain.removeHandler('window:minimize')
  ipcMain.removeHandler('window:toggle-maximize')
  ipcMain.removeHandler('window:close')
  ipcMain.removeHandler('window:is-maximized')
  ipcMain.removeHandler('view:create')
  ipcMain.removeHandler('view:load')
  ipcMain.removeHandler('view:destroy')
  ipcMain.removeHandler('view:set-ignore-mouse-events')
  ipcMain.removeAllListeners('view:set-bounds')
})

