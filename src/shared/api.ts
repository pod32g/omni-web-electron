export type AppApi = {
  getAppVersion: () => Promise<string>;
};

export type WebviewApi = {
  create: (id: string, partition?: string) => Promise<void>;
  load: (id: string, url: string) => Promise<void>;
  setBounds: (id: string, bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
  destroy: (id: string) => Promise<void>;
};

declare global {
  interface Window {
    appApi: AppApi;
    webview: WebviewApi;
  }
}
