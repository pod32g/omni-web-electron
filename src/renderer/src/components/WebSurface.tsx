// src/components/WebSurface.tsx
import { useEffect, useId, useRef } from 'react'

type Props = {
  url: string
  partition?: string           // e.g., "persist:space-abc"
  className?: string           // use to position/size via CSS grid
  paddingTop?: number          // offsets for your custom titlebar
  paddingLeft?: number         // offsets for your sidebar
}

export default function WebSurface({ url, partition, className, paddingTop=0, paddingLeft=0 }: Props) {
  const id = useId().replace(/:/g,'')   // stable-ish ID per mount
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ro: ResizeObserver | null = null
    let alive = true

    const mount = async () => {
      await window.webview.create(id, partition)
      await window.webview.load(id, url)
      const updateBounds = () => {
        const el = hostRef.current!
        const r = el.getBoundingClientRect()
        window.webview.setBounds(id, {
          x: Math.max(0, Math.floor(r.left)) + paddingLeft,
          y: Math.max(0, Math.floor(r.top)) + paddingTop,
          width: Math.max(1, Math.floor(r.width)),
          height: Math.max(1, Math.floor(r.height)),
        })
      }
      updateBounds()
      ro = new ResizeObserver(updateBounds)
      ro.observe(document.body)
      ro.observe(hostRef.current!)
      window.addEventListener('resize', updateBounds)
    }

    mount()
    return () => {
      alive = false
      ro?.disconnect()
      window.removeEventListener('resize', () => {})
      window.webview.destroy(id)
    }
  }, [id, url, partition, paddingTop, paddingLeft])

  // This div is just a placeholder; the real pixels are the BrowserView behind it
  return <div ref={hostRef} className={className} />
}
