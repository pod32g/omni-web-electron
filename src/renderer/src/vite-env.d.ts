// src/vite-env.d.ts
import type { AppApi, WebviewApi, WindowControlsApi } from '../../shared/api'

export {}

declare global {
  interface Window {
    appApi: AppApi
    webview: WebviewApi
    windowControls: WindowControlsApi
  }
}

