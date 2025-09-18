// src/vite-env.d.ts
export {}
declare global {
  interface Window {
    webview: {
      create(id:string, partition?:string): Promise<void>
      setBounds(id:string, b:{x:number;y:number;width:number;height:number}): void
      load(id:string, url:string): Promise<void>
      destroy(id:string): Promise<void>
    }
  }
}
