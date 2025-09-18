import { contextBridge, ipcRenderer } from 'electron';

import type { AppApi } from '../shared/api';

const api: AppApi = {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
};

contextBridge.exposeInMainWorld('appApi', Object.freeze(api));
