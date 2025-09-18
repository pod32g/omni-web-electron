import { useEffect, useState } from 'react';
import WebSurface from './components/WebSurface';

const SidebarItem = ({ label }: { label: string }) => (
  <button
    type="button"
    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-200 hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
  >
    {label}
  </button>
);

const App = () => {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const appVersion = await window.appApi.getAppVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error('Unable to load app version', error);
      }
    };

    void loadVersion();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-64 flex-col gap-4 border-r border-slate-800 bg-slate-900/80 p-6 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold">Omni Electron</h1>
          <p className="text-xs text-slate-400">Build fast with Electron + React.</p>
        </div>
        <nav className="flex flex-col gap-2">
          <SidebarItem label="Dashboard" />
          <SidebarItem label="Settings" />
          <SidebarItem label="These shall be the tabs" />
        </nav>
        <footer className="mt-auto text-xs text-slate-500">
          v{version || '...'}
        </footer>
      </aside>
      <main className="relative flex flex-1">
        {/* The BrowserView is positioned behind this placeholder */}
        <WebSurface url="https://www.google.com" paddingTop={48} paddingLeft={260} className="absolute inset-0" />
      </main>
    </div>
  );
};

export default App;
