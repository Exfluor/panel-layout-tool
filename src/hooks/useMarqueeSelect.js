import { useRef, useState } from 'react'
import { getBounds, rectsOverlap } from '../lib/geometry'

const DRAG_THRESHOLD_PX = 3

function toPixelRect(x1, y1, x2, y2) {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

// Click-drag on the empty canvas background draws a selection rectangle;
// anything whose bounds overlap it becomes selected on release. Shift makes
// it additive. Uses plain pointer events (not dnd-kit) since it only starts
// on the background, where nothing else is listening.
export function useMarqueeSelect({ canvasRef, placedComponents, scale, onSelect }) {
  const [marqueeRect, setMarqueeRect] = useState(null)
  const startRef = useRef(null)
  const additiveRef = useRef(false)

  function handlePointerDown(e) {
    if (e.target !== e.currentTarget) return // only starts from empty canvas background
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    startRef.current = { x, y }
    additiveRef.current = e.shiftKey
    setMarqueeRect(toPixelRect(x, y, x, y))

    function handlePointerMove(moveEvent) {
      const currentRect = canvasRef.current?.getBoundingClientRect()
      if (!currentRect || !startRef.current) return
      const cx = moveEvent.clientX - currentRect.left
      const cy = moveEvent.clientY - currentRect.top
      setMarqueeRect(toPixelRect(startRef.current.x, startRef.current.y, cx, cy))
    }

    function handlePointerUp(upEvent) {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)

      const currentRect = canvasRef.current?.getBoundingClientRect()
      let didDrag = false
      if (currentRect && startRef.current && scale > 0) {
        const cx = upEvent.clientX - currentRect.left
        const cy = upEvent.clientY - currentRect.top
        const pixelRect = toPixelRect(startRef.current.x, startRef.current.y, cx, cy)

        if (pixelRect.width > DRAG_THRESHOLD_PX || pixelRect.height > DRAG_THRESHOLD_PX) {
          didDrag = true
          const selectionBounds = {
            x: pixelRect.left / scale,
            y: pixelRect.top / scale,
            width: pixelRect.width / scale,
            height: pixelRect.height / scale,
          }
          const ids = placedComponents
            .filter((c) => rectsOverlap(selectionBounds, getBounds(c)))
            .map((c) => c.id)
          if (ids.length > 0 || !additiveRef.current) {
            onSelect(ids, { additive: additiveRef.current })
          }
        }
      }

      // A pointerdown and pointerup that both land on the canvas background
      // (releasing inside it, over empty space) makes the browser fire a
      // native 'click' on it right after — which would immediately run the
      // canvas's own click-to-deselect handler and wipe the selection we
      // just made. Swallow that one click in the capture phase.
      if (didDrag) {
        function suppressClick(clickEvent) {
          clickEvent.stopPropagation()
          window.removeEventListener('click', suppressClick, true)
        }
        window.addEventListener('click', suppressClick, true)
      }

      startRef.current = null
      setMarqueeRect(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return { marqueeRect, handlePointerDown }
}
