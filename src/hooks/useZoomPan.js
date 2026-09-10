import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const WHEEL_SENSITIVITY = 0.0015
const STEP_FACTOR = 1.25

function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
}

// Manages a zoom multiplier on top of a fit-to-container base scale, plus the
// scroll position of the container that shows the zoomed content. Ctrl+wheel
// (and trackpad pinch, which browsers report as ctrl+wheel) zooms toward the
// cursor by adjusting scroll position right after the zoom-triggered re-render
// commits, so the point under the cursor stays put.
export function useZoomPan(containerRef, fitScale) {
  const [zoom, setZoom] = useState(1)
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 })
  const pendingAnchorRef = useRef(null)

  const scale = fitScale * zoom

  const handleWheel = useCallback(
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      const container = containerRef.current
      if (!container || !fitScale) return
      e.preventDefault()

      const rect = container.getBoundingClientRect()
      const cursorInContentX = e.clientX - rect.left + container.scrollLeft
      const cursorInContentY = e.clientY - rect.top + container.scrollTop

      setZoom((prevZoom) => {
        const nextZoom = clampZoom(prevZoom * Math.exp(-e.deltaY * WHEEL_SENSITIVITY))
        const ratio = nextZoom / prevZoom
        pendingAnchorRef.current = {
          left: cursorInContentX * ratio - (e.clientX - rect.left),
          top: cursorInContentY * ratio - (e.clientY - rect.top),
        }
        return nextZoom
      })
    },
    [containerRef, fitScale],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [containerRef, handleWheel])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !pendingAnchorRef.current) return
    container.scrollLeft = pendingAnchorRef.current.left
    container.scrollTop = pendingAnchorRef.current.top
    pendingAnchorRef.current = null
  }, [zoom, containerRef])

  function handleScroll() {
    const container = containerRef.current
    if (!container) return
    setScrollPos({ left: container.scrollLeft, top: container.scrollTop })
  }

  function zoomIn() {
    setZoom((z) => clampZoom(z * STEP_FACTOR))
  }

  function zoomOut() {
    setZoom((z) => clampZoom(z / STEP_FACTOR))
  }

  function resetZoom() {
    setZoom(1)
  }

  return { zoom, scale, scrollPos, handleScroll, zoomIn, zoomOut, resetZoom }
}
