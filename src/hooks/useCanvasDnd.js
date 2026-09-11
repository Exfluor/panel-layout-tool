import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useRef, useState } from 'react'
import { getEffectiveSize } from '../lib/geometry'
import { computeSnappedPosition } from '../lib/snapping'

const SNAP_THRESHOLD_PX = 8

function toBounds(component) {
  const { width, height } = getEffectiveSize(component)
  return { id: component.id, x: component.x, y: component.y, width, height, isRail: component.isRail }
}

// The point that grid-snap should target for a dragged item, matching
// whatever PartDimensionGuides actually displays for it — a regular part
// always measures from its top edge, while a rail measures from whichever
// edge/center the user has chosen.
function getMeasureOffset(isRail, height, railMeasureMode) {
  if (!isRail) return 0
  if (railMeasureMode === 'top') return 0
  if (railMeasureMode === 'bottom') return height
  return height / 2
}

export function useCanvasDnd({
  panelWidth,
  panelHeight,
  scale,
  canvasRef,
  layout,
  gridSnapEnabled,
  railMeasureMode = 'center',
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const [dragGhost, setDragGhost] = useState(null)
  const [activeLibraryComponent, setActiveLibraryComponent] = useState(null)
  const dragOriginRef = useRef(null)

  function getCanvasRect() {
    return canvasRef.current?.getBoundingClientRect() ?? null
  }

  function pointerToInches(clientX, clientY) {
    const rect = getCanvasRect()
    if (!rect || !scale) return { x: 0, y: 0 }
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
  }

  function handleDragStart(event) {
    const data = event.active.data.current
    const activatorEvent = event.activatorEvent
    const pointerStart = { x: activatorEvent.clientX, y: activatorEvent.clientY }

    if (data.type === 'library') {
      dragOriginRef.current = {
        type: 'library',
        component: data.component,
        quantity: data.quantity ?? 1,
        pointerStart,
      }
      setActiveLibraryComponent(data.component)
      return
    }

    if (data.type === 'placed') {
      const primary = layout.placedComponents.find((c) => c.id === data.id)
      if (!primary || primary.locked) return // locked items can't be dragged at all

      // Dragging any member of a multi-selection moves the whole selection
      // together (each item's own group/rail-mounted parts come along too).
      // Dragging an item that isn't part of the current selection just moves
      // that item (and its own group) as before.
      let groupIds
      if (layout.selectedIds.has(primary.id) && layout.selectedIds.size > 1) {
        const idSet = new Set()
        layout.selectedIds.forEach((id) => {
          const c = layout.placedComponents.find((cc) => cc.id === id)
          if (!c || c.locked) return
          layout.getMovableGroupIds(c).forEach((gid) => idSet.add(gid))
        })
        groupIds = Array.from(idSet)
      } else {
        groupIds = layout.getMovableGroupIds(primary)
      }

      const origins = {}
      groupIds.forEach((id) => {
        const c = layout.placedComponents.find((cc) => cc.id === id)
        origins[id] = { x: c.x, y: c.y }
      })
      dragOriginRef.current = { type: 'placed', primaryId: primary.id, groupIds, origins, pointerStart }
    }
  }

  function computeCandidate(event) {
    const origin = dragOriginRef.current
    if (!origin || !scale) return null
    const threshold = SNAP_THRESHOLD_PX / scale

    if (origin.type === 'library') {
      const pointer = { x: origin.pointerStart.x + event.delta.x, y: origin.pointerStart.y + event.delta.y }
      const inches = pointerToInches(pointer.x, pointer.y)
      const { width, height } = origin.component
      const rawX = inches.x - width / 2
      const rawY = inches.y - height / 2
      // A rail is a structural element: only other rails (plus the panel walls/center,
      // always included) should pull its position — parts mounted on it shouldn't.
      const others = layout.placedComponents
        .filter((c) => !origin.component.isRail || c.isRail)
        .map(toBounds)
      const snapped = computeSnappedPosition({
        x: rawX,
        y: rawY,
        width,
        height,
        others,
        panelWidth,
        panelHeight,
        threshold,
        centerInPanel: Boolean(origin.component.isRail),
        gridSnapEnabled,
        measureOffset: getMeasureOffset(Boolean(origin.component.isRail), height, railMeasureMode),
      })
      return {
        type: 'new',
        component: origin.component,
        x: snapped.x,
        y: snapped.y,
        width,
        height,
        quantity: origin.quantity,
        pointer,
        snappedRailId: snapped.snappedRailId,
      }
    }

    if (origin.type === 'placed') {
      const deltaX = event.delta.x / scale
      const deltaY = event.delta.y / scale
      const primaryOrigin = origin.origins[origin.primaryId]
      const primary = layout.placedComponents.find((c) => c.id === origin.primaryId)
      const { width, height } = getEffectiveSize(primary)
      const rawX = primaryOrigin.x + deltaX
      const rawY = primaryOrigin.y + deltaY
      const others = layout.placedComponents
        .filter((c) => !origin.groupIds.includes(c.id))
        .filter((c) => !primary.isRail || c.isRail)
        .map(toBounds)
      const snapped = computeSnappedPosition({
        x: rawX,
        y: rawY,
        width,
        height,
        others,
        panelWidth,
        panelHeight,
        threshold,
        centerInPanel: Boolean(primary.isRail),
        gridSnapEnabled,
        measureOffset: getMeasureOffset(Boolean(primary.isRail), height, railMeasureMode),
      })
      return {
        type: 'move',
        groupIds: origin.groupIds,
        deltaX: snapped.x - primaryOrigin.x,
        deltaY: snapped.y - primaryOrigin.y,
        snappedRailId: snapped.snappedRailId,
      }
    }

    return null
  }

  function handleDragMove(event) {
    setDragGhost(computeCandidate(event))
  }

  function handleDragEnd(event) {
    const candidate = computeCandidate(event)

    if (candidate?.type === 'new') {
      const rect = getCanvasRect()
      const droppedOnCanvas =
        rect &&
        candidate.pointer.x >= rect.left &&
        candidate.pointer.x <= rect.right &&
        candidate.pointer.y >= rect.top &&
        candidate.pointer.y <= rect.bottom
      if (droppedOnCanvas) {
        layout.placeMultiple(candidate.component, candidate.x, candidate.y, candidate.quantity)
      }
    } else if (candidate?.type === 'move') {
      layout.moveGroup(candidate.groupIds, candidate.deltaX, candidate.deltaY)
    }

    setDragGhost(null)
    setActiveLibraryComponent(null)
    dragOriginRef.current = null
  }

  function handleDragCancel() {
    setDragGhost(null)
    setActiveLibraryComponent(null)
    dragOriginRef.current = null
  }

  return {
    sensors,
    dragGhost,
    activeLibraryComponent,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  }
}
