export type AppApi = {
  getAppVersion: () => Promise<string>;
};

declare global {
  interface Window {
    appApi: AppApi;
  }
}
