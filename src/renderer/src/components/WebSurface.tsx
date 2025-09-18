// src/components/WebSurface.tsx
import { useEffect, useId, useRef } from 'react'

type Props = {
  url: string
  partition?: string           // e.g., "persist:space-abc"
  className?: string           // use to position/size via CSS grid
  paddingTop?: number          // offsets for your custom titlebar
  paddingLeft?: number         // offsets for your sidebar
}

export default function WebSurface({ url, partition, className, paddingTop = 0, paddingLeft = 0 }: Props) {
  const id = useId().replace(/:/g, '') // stable-ish ID per mount
  const hostRef = useRef<HTMLDivElement>(null)
  const readyRef = useRef<Promise<void> | null>(null)
  const updateBoundsRef = useRef<() => void>(() => {})

  const updateBounds = () => {
    const el = hostRef.current
    if (!el) {
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

    let disposed = false
    let resizeObserver: ResizeObserver | null = null

    const handleResize = () => {
      updateBoundsRef.current()
    }

    const readyPromise = (async () => {
      try {
        await window.webview.create(id, partition)
        if (disposed) {
          await window.webview.destroy(id)
          return
        }

        updateBoundsRef.current()

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            updateBoundsRef.current()
          })
          resizeObserver.observe(host)
          if (document.body) {
            resizeObserver.observe(document.body)
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        console.error('Failed to create webview', error)
        throw error
      }
    })()

    readyRef.current = readyPromise

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
      readyRef.current = null

      readyPromise
        .then(() => window.webview.destroy(id))
        .catch((error) => {
          console.error('Failed to destroy webview', error)
        })
    }
  }, [id, partition])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const ready = readyRef.current
        if (ready) {
          await ready
        }
        if (cancelled) {
          return
        }
        await window.webview.load(id, url)
        updateBoundsRef.current()
      } catch (error) {
        console.error('Failed to load url in webview', error)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id, url])

  useEffect(() => {
    updateBoundsRef.current()
  }, [paddingTop, paddingLeft])

  // This div is just a placeholder; the real pixels are the BrowserView behind it
  return <div ref={hostRef} className={className} style={{ pointerEvents: 'none' }} />
}
