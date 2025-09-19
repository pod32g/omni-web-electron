import { type CSSProperties, useCallback, useEffect, useState } from 'react'
import WebSurface from './components/WebSurface'

const SIDEBAR_WIDTH = 260
const DEFAULT_URL = 'https://www.google.com'

const dragRegionStyle: CSSProperties = { WebkitAppRegion: 'drag' }
const noDragRegionStyle: CSSProperties = { WebkitAppRegion: 'no-drag' }

const windowButtonBase = 'inline-flex h-8 w-10 items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400'
const windowButton = `${windowButtonBase} text-slate-300 hover:bg-slate-800/80`
const windowCloseButton = `${windowButtonBase} text-slate-300 hover:bg-red-500/80 hover:text-slate-950`

const SidebarItem = ({ label }: { label: string }) => (
  <button
    type="button"
    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-200 hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
  >
    {label}
  </button>
)

const App = () => {
  const [version, setVersion] = useState<string>('')
  const [isMaximized, setIsMaximized] = useState<boolean>(false)
  const [currentUrl, setCurrentUrl] = useState<string>(DEFAULT_URL)
  const [pageTitle, setPageTitle] = useState<string>(DEFAULT_URL)

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const appVersion = await window.appApi.getAppVersion()
        setVersion(appVersion)
      } catch (error) {
        console.error('Unable to load app version', error)
      }
    }

    void loadVersion()
  }, [])

  useEffect(() => {
    if (!window.windowControls) {
      return
    }

    let dispose: (() => void) | undefined
    window.windowControls
      .isMaximized()
      .then(setIsMaximized)
      .catch((error) => {
        console.error('Unable to read window maximize state', error)
      })

    dispose = window.windowControls.onMaximizedChange?.(setIsMaximized)

    return () => {
      dispose?.()
    }
  }, [])

  const handleMinimize = useCallback(() => {
    void window.windowControls?.minimize()
  }, [])

  const handleToggleMaximize = useCallback(() => {
    void window.windowControls?.toggleMaximize()
  }, [])

  const handleClose = useCallback(() => {
    void window.windowControls?.close()
  }, [])

  const handlePageInfo = useCallback((info: { url: string; title: string }) => {
    if (info.url) {
      setCurrentUrl(info.url)
    }
    const title = info.title?.trim() || info.url
    if (title) {
      setPageTitle(title)
    }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header
        className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 text-sm font-semibold text-slate-200 backdrop-blur"
        style={dragRegionStyle}
      >
        <div className="flex items-center gap-3" style={noDragRegionStyle}>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">v{version || '...'}</span>
          <span className="max-w-xs truncate text-sm text-slate-200" title={pageTitle}>
            {pageTitle}
          </span>
        </div>
        <div className="flex items-center gap-2" style={noDragRegionStyle}>
          <div className="flex overflow-hidden rounded-md border border-slate-800/60">
            <button type="button" aria-label="Minimize window" className={windowButton} onClick={handleMinimize}>
              <span className="h-0.5 w-3 bg-slate-300" />
            </button>
            <button
              type="button"
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
              className={windowButton}
              onClick={handleToggleMaximize}
            >
              {isMaximized ? (
                <span className="relative h-3 w-3">
                  <span className="absolute -top-0.5 -left-0.5 h-3 w-3 border border-slate-300" />
                  <span className="absolute inset-0 border border-slate-300 bg-transparent" />
                </span>
              ) : (
                <span className="h-3 w-3 border border-slate-300" />
              )}
            </button>
            <button type="button" aria-label="Close window" className={windowCloseButton} onClick={handleClose}>
              <span className="relative h-3 w-3">
                <span className="absolute left-1/2 top-1/2 h-0.5 w-full -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-slate-200" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-full -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-200" />
              </span>
            </button>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside
          className="flex h-full flex-col gap-4 border-r border-slate-800 bg-slate-900/80 p-6 backdrop-blur"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div>
            <h1 className="text-lg font-semibold">Omni Electron</h1>
            <p className="text-xs text-slate-400">Build fast with Electron + React.</p>
          </div>
          <nav className="flex flex-col gap-2">
            <SidebarItem label="Dashboard" />
            <SidebarItem label="Settings" />
            <SidebarItem label="These shall be the tabs" />
          </nav>
          <footer className="mt-auto text-xs text-slate-500">v{version || '...'}</footer>
        </aside>
        <main className="relative flex-1">
          <WebSurface url={currentUrl} className="absolute inset-0" onPageInfo={handlePageInfo} />
        </main>
      </div>
    </div>
  )
}

export default App
