import { useRef, useState } from 'react'
import { getBounds } from '../lib/geometry'
import { snapEdge } from '../lib/snapping'

const SNAP_THRESHOLD_PX = 8
const MIN_SIZE = 0.25 // inches — a cut can't shrink a part past this

// Drag a component's edge handle to stretch or cut it (e.g. lengthening a
// run of Panduit) — plain pointer events, like useMarqueeSelect, since this
// is a distinct gesture from dnd-kit's whole-box move/place. The dragged
// edge snaps flush against any other part's edge (always on, matching the
// other structural edge-snaps) and falls back to the 1/8" grid when nothing
// is near and gridSnapEnabled is on. Only commits to real state on release —
// `resizeGhost` is the live preview during the drag.
export function useResizeHandle({ placedComponents, scale, panelWidth, panelHeight, gridSnapEnabled, onResize }) {
  const [resizeGhost, setResizeGhost] = useState(null)
  const originRef = useRef(null)

  function startResize(component, edge) {
    if (component.locked) return () => {}

    return function handlePointerDown(e) {
      e.stopPropagation()
      e.preventDefault()

      const bounds = getBounds(component)
      const startX = e.clientX
      const startY = e.clientY
      originRef.current = { id: component.id, edge, bounds }
      setResizeGhost({ id: component.id, ...bounds })

      const others = placedComponents.filter((c) => c.id !== component.id).map((c) => getBounds(c))
      const edgesX = others.flatMap((o) => [o.x, o.x + o.width])
      const edgesY = others.flatMap((o) => [o.y, o.y + o.height])

      function handlePointerMove(moveEvent) {
        if (!scale) return
        const deltaX = (moveEvent.clientX - startX) / scale
        const deltaY = (moveEvent.clientY - startY) / scale
        const threshold = SNAP_THRESHOLD_PX / scale
        let { x, y, width, height } = bounds

        if (edge === 'right') {
          const right = snapEdge(bounds.x + bounds.width + deltaX, [...edgesX, panelWidth], threshold, gridSnapEnabled)
          width = Math.max(MIN_SIZE, Math.min(right, panelWidth) - bounds.x)
        } else if (edge === 'left') {
          const left = snapEdge(bounds.x + deltaX, [...edgesX, 0], threshold, gridSnapEnabled)
          const right = bounds.x + bounds.width
          x = Math.max(0, Math.min(left, right - MIN_SIZE))
          width = right - x
        } else if (edge === 'bottom') {
          const bottom = snapEdge(bounds.y + bounds.height + deltaY, [...edgesY, panelHeight], threshold, gridSnapEnabled)
          height = Math.max(MIN_SIZE, Math.min(bottom, panelHeight) - bounds.y)
        } else if (edge === 'top') {
          const top = snapEdge(bounds.y + deltaY, [...edgesY, 0], threshold, gridSnapEnabled)
          const bottom = bounds.y + bounds.height
          y = Math.max(0, Math.min(top, bottom - MIN_SIZE))
          height = bottom - y
        }

        setResizeGhost({ id: component.id, x, y, width, height })
      }

      function handlePointerUp() {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        setResizeGhost((ghost) => {
          if (ghost) onResize(component.id, ghost)
          return null
        })
        originRef.current = null
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }
  }

  return { resizeGhost, startResize }
}
