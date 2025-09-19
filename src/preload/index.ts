// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('appApi', {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
})

const loadingListeners = new Map<string, Set<(isLoading: boolean) => void>>()

ipcRenderer.on('view:loading-state', (_event, payload: { id: string; isLoading: boolean }) => {
  const listeners = loadingListeners.get(payload.id)
  if (!listeners) {
    return
  }
  listeners.forEach((listener) => {
    try {
      listener(payload.isLoading)
    } catch (error) {
      console.error('webview.onLoadingState listener failed', error)
    }
  })
})

const pageInfoListeners = new Map<string, Set<(info: { url: string; title: string }) => void>>()

ipcRenderer.on('view:page-info', (_event, payload: { id: string; url: string; title: string }) => {
  const listeners = pageInfoListeners.get(payload.id)
  if (!listeners) {
    return
  }
  listeners.forEach((listener) => {
    try {
      listener({ url: payload.url, title: payload.title })
    } catch (error) {
      console.error('webview.onPageInfo listener failed', error)
    }
  })
})

const windowControlsListeners = new Set<(isMaximized: boolean) => void>()

ipcRenderer.on('window:maximized-change', (_event, isMaximized: boolean) => {
  windowControlsListeners.forEach((listener) => {
    try {
      listener(isMaximized)
    } catch (error) {
      console.error('windowControls listener failed', error)
    }
  })
})

contextBridge.exposeInMainWorld('webview', {
  create: (id: string, partition?: string) => {
    console.log('Preload: webview.create called', { id, partition });
    return ipcRenderer.invoke('view:create', { id, partition });
  },
  setBounds: (id: string, b: { x: number; y: number; width: number; height: number }) => {
    console.log('Preload: webview.setBounds called', { id, bounds: b });
    return ipcRenderer.send('view:set-bounds', { id, bounds: b });
  },
  load: (id: string, url: string) => {
    console.log('Preload: webview.load called', { id, url });
    return ipcRenderer.invoke('view:load', { id, url });
  },
  destroy: (id: string) => {
    console.log('Preload: webview.destroy called', { id });
    return ipcRenderer.invoke('view:destroy', { id });
  },
  setIgnoreMouseEvents: (id: string, ignore: boolean, options?: { forward?: boolean }) => {
    console.log('Preload: webview.setIgnoreMouseEvents called', { id, ignore, options });
    return ipcRenderer.invoke('view:set-ignore-mouse-events', { id, ignore, forward: options?.forward });
  },
  onLoadingState: (id: string, listener: (isLoading: boolean) => void) => {
    const listeners = loadingListeners.get(id) ?? new Set<(isLoading: boolean) => void>()
    listeners.add(listener)
    loadingListeners.set(id, listeners)

    return () => {
      const current = loadingListeners.get(id)
      if (!current) {
        return
      }
      current.delete(listener)
      if (current.size === 0) {
        loadingListeners.delete(id)
      }
    }
  },
  onPageInfo: (id: string, listener: (info: { url: string; title: string }) => void) => {
    const listeners = pageInfoListeners.get(id) ?? new Set<(info: { url: string; title: string }) => void>()
    listeners.add(listener)
    pageInfoListeners.set(id, listeners)

    return () => {
      const current = pageInfoListeners.get(id)
      if (!current) {
        return
      }
      current.delete(listener)
      if (current.size === 0) {
        pageInfoListeners.delete(id)
      }
    }
  },
})

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (listener: (isMaximized: boolean) => void) => {
    windowControlsListeners.add(listener)

    return () => {
      windowControlsListeners.delete(listener)
    }
  },
})


