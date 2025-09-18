// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('appApi', {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
})

contextBridge.exposeInMainWorld('webview', {
  create: (id: string, partition?: string) => ipcRenderer.invoke('view:create', { id, partition }),
  setBounds: (id: string, b: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.send('view:set-bounds', { id, bounds: b }),
  load: (id: string, url: string) => ipcRenderer.invoke('view:load', { id, url }),
  destroy: (id: string) => ipcRenderer.invoke('view:destroy', { id }),
})
