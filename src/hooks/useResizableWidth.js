import { useEffect, useRef } from 'react'
import { useLocalStorageState } from './useLocalStorageState'

// Tracks a persisted width, adjustable by dragging a handle. Assumes the
// resized element sits flush against the left edge of the viewport, so the
// pointer's clientX during the drag directly equals the new width.
export function useResizableWidth(storageKey, defaultWidth, { min = 200, max = 500 } = {}) {
  const [width, setWidth] = useLocalStorageState(storageKey, defaultWidth)
  const resizingRef = useRef(false)

  useEffect(() => {
    function handleMouseMove(e) {
      if (!resizingRef.current) return
      setWidth(Math.min(max, Math.max(min, e.clientX)))
    }
    function handleMouseUp() {
      if (!resizingRef.current) return
      resizingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setWidth, min, max])

  function startResize(e) {
    e.preventDefault()
    resizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return { width, startResize }
}
