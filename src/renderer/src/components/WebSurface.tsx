// src/components/WebSurface.tsx
import { useEffect, useRef, useState } from 'react'

// Global webview manager to handle StrictMode remounting
const webviewManager = new Map<string, { created: boolean; url?: string }>()

const isDebugEnabled = () => typeof window !== 'undefined' && Boolean(window.__OMNI_ENABLE_LOGS);
const debugLog = (...args: unknown[]) => {
  if (isDebugEnabled()) {
    debugLog(...args);
  }
};
const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled()) {
    debugWarn(...args);
  }
};
const debugError = (...args: unknown[]) => {
  if (isDebugEnabled()) {
    debugError(...args);
  }
};

type Props = {
  url: string
  partition?: string           // e.g., "persist:space-abc"
  className?: string           // use to position/size via CSS grid
  paddingTop?: number          // offsets for your custom titlebar
  paddingLeft?: number         // offsets for your sidebar
  onPageInfo?: (info: { url: string; title: string }) => void
  isOverlayActive?: boolean    // disables BrowserView interactions when overlays are visible
  isActive?: boolean          // hides BrowserView when an internal view is shown
}

export default function WebSurface({ url, partition, className, paddingTop = 0, paddingLeft = 0, onPageInfo, isOverlayActive = false, isActive = true }: Props) {
  // Use a more stable ID that persists across StrictMode remounts
  const id = useRef(`webview-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`).current
  const hostRef = useRef<HTMLDivElement>(null)
  const readyRef = useRef<Promise<void> | null>(null)
  const updateBoundsRef = useRef<() => void>(() => {})
  const webviewCreatedRef = useRef(false)
  const lastLoadedUrlRef = useRef<string | null>(null)
  const loadTimeoutRef = useRef<number | null>(null)
  const isLoadInProgressRef = useRef(false)
  const [isLoading, setIsLoading] = useState(true)

  const updateBounds = () => {
    const el = hostRef.current
    if (!el || !webviewCreatedRef.current) {
      return
    }
    if (!isActive) {
      window.webview.setBounds(id, { x: 0, y: 0, width: 0, height: 0 })
      return
    }
    const r = el.getBoundingClientRect()
    window.webview.setBounds(id, {
      x: Math.max(0, Math.floor(r.left)) + paddingLeft,
      y: Math.max(0, Math.floor(r.top)) + paddingTop,
      width: Math.max(1, Math.floor(r.width)),
      height: Math.max(1, Math.floor(r.height)),
    })
  }

  updateBoundsRef.current = updateBounds

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    let resizeObserver: ResizeObserver | null = null
    let boundsTimeout: number | null = null

    const handleResize = () => {
      // Debounce bounds updates
      if (boundsTimeout) {
        clearTimeout(boundsTimeout)
      }
      boundsTimeout = window.setTimeout(() => {
        updateBoundsRef.current()
      }, 16) // ~60fps
    }

    const readyPromise = (async () => {
      try {
        // Check if webview already exists globally
        const existing = webviewManager.get(id)
        if (existing?.created) {
          debugLog('WebSurface: Webview already exists globally', { id })
          webviewCreatedRef.current = true
        } else {
          debugLog('WebSurface: Creating webview', { id, partition })
          await window.webview.create(id, partition)
          debugLog('WebSurface: Webview created successfully', { id })
          webviewManager.set(id, { created: true, url })
          webviewCreatedRef.current = true
        }
        
        updateBoundsRef.current()

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(handleResize)
          resizeObserver.observe(host)
          if (document.body) {
            resizeObserver.observe(document.body)
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        debugError('Failed to create webview', error)
        throw error
      }
    })()

    readyRef.current = readyPromise

    return () => {
      if (boundsTimeout) {
        clearTimeout(boundsTimeout)
      }
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
      readyRef.current = null

      // Don't destroy webview on component unmount in StrictMode
      // The webview will persist and be reused when component remounts
      debugLog('WebSurface: Component cleanup (webview persists)', { id })
    }
  }, [id, partition, url])

  useEffect(() => {
    debugLog('WebSurface: Setting up loading state listener', { id, hasWebview: !!window.webview, hasOnLoadingState: !!window.webview?.onLoadingState })
    
    if (!window.webview?.onLoadingState) {
      debugWarn('WebSurface: window.webview.onLoadingState not available')
      setIsLoading(false)
      return
    }

    const dispose = window.webview.onLoadingState(id, (loading) => {
      debugLog('WebSurface: Loading state changed', { id, loading })
      setIsLoading(loading)
    })

    return () => {
      dispose()
    }
  }, [id])

  useEffect(() => {
    debugLog('WebSurface: Setting up page info listener', { id, hasWebview: !!window.webview, hasOnPageInfo: !!window.webview?.onPageInfo })
    
    if (!window.webview?.onPageInfo) {
      debugWarn('WebSurface: window.webview.onPageInfo not available')
      return
    }

    const dispose = window.webview.onPageInfo(id, (info) => {
      debugLog('WebSurface: Page info received', { id, info })
      setIsLoading(false)
      onPageInfo?.(info)
    })

    return () => {
      dispose()
    }
  }, [id, onPageInfo, url])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        // Check if we've already loaded this URL (normalize by removing query params for comparison)
        const normalizedUrl = url.split('?')[0]
        const normalizedLastUrl = lastLoadedUrlRef.current?.split('?')[0]
        
        if (normalizedUrl === normalizedLastUrl) {
          debugLog('WebSurface: URL already loaded (normalized), skipping', { id, url, normalizedUrl })
          return
        }

        // Prevent rapid successive loads
        if (isLoadInProgressRef.current) {
          debugLog('WebSurface: Load already in progress, skipping', { id, url })
          return
        }

        const ready = readyRef.current
        if (ready) {
          await ready
        }
        if (cancelled) {
          return
        }
        
        debugLog('WebSurface: Loading URL', { id, url })
        isLoadInProgressRef.current = true
        setIsLoading(true)
        await window.webview.load(id, url)
        lastLoadedUrlRef.current = url
        updateBoundsRef.current()
      } catch (error) {
        debugError('WebSurface: Failed to load URL', { id, url, error })
      } finally {
        if (!cancelled) {
          isLoadInProgressRef.current = false
          setIsLoading(false)
        }
      }
    }

    // Debounce load calls to prevent rapid successive requests
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
    }
    
    loadTimeoutRef.current = window.setTimeout(() => {
      void load()
    }, 100) // 100ms debounce

    return () => {
      cancelled = true
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
    }
  }, [id, url])

  useEffect(() => {
    updateBoundsRef.current()
  }, [paddingTop, paddingLeft, isActive])

  useEffect(() => {
    const toggle = async (ignore: boolean) => {
      if (typeof window === 'undefined' || !window.webview?.setIgnoreMouseEvents) {
        return
      }

      try {
        const ready = readyRef.current
        if (ready) {
          await ready
        }
        if (!webviewCreatedRef.current) {
          return
        }
        await window.webview.setIgnoreMouseEvents(id, ignore, ignore ? { forward: true } : undefined)
      } catch (error) {
        console.error('WebSurface: Failed to update BrowserView mouse events', { id, ignore, error })
      }
    }

    const shouldIgnore = isOverlayActive || !isActive
    void toggle(shouldIgnore)

    return () => {
      if (shouldIgnore) {
        void toggle(false)
      }
    }
  }, [id, isActive, isOverlayActive])

  const containerClasses = ['pointer-events-none']
  if (!className) {
    containerClasses.push('relative')
  }
  const containerClassName = [className, ...containerClasses].filter(Boolean).join(' ')

  // This div is just a placeholder; the real pixels are the BrowserView behind it
  return (
    <div ref={hostRef} className={containerClassName} style={{ pointerEvents: 'none'}}>
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 shadow-lg backdrop-blur">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span>Loading...</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}






