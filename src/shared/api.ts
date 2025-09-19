export type AppApi = {
  getAppVersion: () => Promise<string>;
};

export type WebviewApi = {
  create: (id: string, partition?: string) => Promise<void>;
  load: (id: string, url: string) => Promise<void>;
  setBounds: (id: string, bounds: { x: number; y: number; width: number; height: number }) => void;
  destroy: (id: string) => Promise<void>;
  onLoadingState: (id: string, listener: (isLoading: boolean) => void) => () => void;
  onPageInfo: (id: string, listener: (info: { url: string; title: string }) => void) => () => void;
  setIgnoreMouseEvents: (id: string, ignore: boolean, options?: { forward?: boolean }) => Promise<void>;
};

export type WindowControlsApi = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (listener: (isMaximized: boolean) => void) => () => void;
};

declare global {
  interface Window {
    appApi: AppApi;
    webview: WebviewApi;
    windowControls: WindowControlsApi;
  }
}




