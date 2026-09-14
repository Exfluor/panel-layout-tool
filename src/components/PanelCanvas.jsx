import { useMarqueeSelect } from '../hooks/useMarqueeSelect'
import { useResizeHandle } from '../hooks/useResizeHandle'
import { getBounds, getEffectiveSize } from '../lib/geometry'
import { formatInches as formatInchesValue } from '../lib/formatInches'
import EditableLabel from './EditableLabel'
import PartDimensionGuides from './PartDimensionGuides'
import PlacedComponent from './PlacedComponent'
import RailDragHandle from './RailDragHandle'

// The box actually drawn for a component: its resize-handle ghost while
// being stretched/cut takes priority, then the move-drag ghost's offset,
// then its plain placed position/size.
function getRenderRect(component, dragGhost, resizeGhost) {
  if (resizeGhost?.id === component.id) {
    return resizeGhost
  }
  const { width, height } = getEffectiveSize(component)
  let x = component.x
  let y = component.y
  if (dragGhost?.type === 'move' && dragGhost.groupIds.includes(component.id)) {
    x += dragGhost.deltaX
    y += dragGhost.deltaY
  }
  return { x, y, width, height }
}

function railMeasureY(y, height, railMeasureMode) {
  if (railMeasureMode === 'top') return y
  if (railMeasureMode === 'bottom') return y + height
  return y + height / 2 // 'center'
}

function toMeasured(id, x, y, width, height, isRail, railMeasureMode, editable) {
  return {
    id,
    x,
    y,
    width,
    height,
    isRail,
    editable,
    measureY: isRail ? railMeasureY(y, height, railMeasureMode) : y,
  }
}

// If a rail is among the components being measured, show only the rail's own
// guide — a rail dragged together with everything mounted on it would
// otherwise show a guide per mounted part, which gets crowded fast.
function dropNonRailsIfRailPresent(components) {
  return components.some((c) => c.isRail) ? components.filter((c) => c.isRail) : components
}

// Any selected, dragged, or newly-placed part gets dimension guides — a rail
// measures/snaps by whichever edge/center is chosen (railMeasureMode), while
// a regular part always measures from its top edge. Only a static (not
// mid-drag) selection is editable — clicking a label then lets you type an
// exact value and move the part to match.
function getMeasuredComponents(placedComponents, selectedIds, dragGhost, railMeasureMode) {
  if (dragGhost?.type === 'new') {
    const isRail = Boolean(dragGhost.component.isRail)
    return [toMeasured(null, dragGhost.x, dragGhost.y, dragGhost.width, dragGhost.height, isRail, railMeasureMode, false)]
  }

  if (dragGhost?.type === 'move') {
    const group = dropNonRailsIfRailPresent(
      placedComponents.filter((c) => dragGhost.groupIds.includes(c.id)),
    )
    return group.map((c) => {
      const { width, height } = getEffectiveSize(c)
      return toMeasured(
        c.id,
        c.x + dragGhost.deltaX,
        c.y + dragGhost.deltaY,
        width,
        height,
        c.isRail,
        railMeasureMode,
        false,
      )
    })
  }

  const selected = dropNonRailsIfRailPresent(placedComponents.filter((c) => selectedIds.has(c.id)))
  return selected.map((c) => {
    const { width, height } = getEffectiveSize(c)
    return toMeasured(c.id, c.x, c.y, width, height, c.isRail, railMeasureMode, !c.locked)
  })
}

// When exactly two components are selected (and neither is mid-drag) and one
// sits cleanly above the other, shows the vertical clearance between them —
// e.g. the gap between a Panduit duct and the DIN rail below it. The
// last-selected of the two (anchorId) stays fixed; editing the gap moves the
// other one to match. If that mover is mounted on a rail, the move is
// redirected to the rail itself (carrying everything mounted on it) instead
// of detaching just the one selected part.
function getSelectionGap(placedComponents, selectedIds, dragGhost, anchorId) {
  if (dragGhost || selectedIds.size !== 2) return null
  const ids = [...selectedIds]
  const a = placedComponents.find((c) => c.id === ids[0])
  const b = placedComponents.find((c) => c.id === ids[1])
  if (!a || !b) return null

  const upperCandidate = { ...getBounds(a), id: a.id }
  const lowerCandidate = { ...getBounds(b), id: b.id }
  let upper = null
  let lower = null
  if (upperCandidate.y + upperCandidate.height <= lowerCandidate.y + 1e-6) {
    upper = upperCandidate
    lower = lowerCandidate
  } else if (lowerCandidate.y + lowerCandidate.height <= upperCandidate.y + 1e-6) {
    upper = lowerCandidate
    lower = upperCandidate
  } else {
    return null // vertically overlapping — no clean "gap" to show
  }

  const gap = lower.y - (upper.y + upper.height)
  if (gap < 0.01) return null

  const resolvedAnchorId = anchorId === upper.id || anchorId === lower.id ? anchorId : ids[ids.length - 1]
  const anchorIsUpper = resolvedAnchorId === upper.id
  const mover = (anchorIsUpper ? lower : upper).id === a.id ? a : b
  const moveTarget = mover.mountedOnRailId
    ? (placedComponents.find((c) => c.id === mover.mountedOnRailId) ?? mover)
    : mover

  const lineX = (upper.x + upper.width / 2 + lower.x + lower.width / 2) / 2
  return {
    lineX,
    topY: upper.y + upper.height,
    gap,
    upperY: upper.y,
    upperHeight: upper.height,
    lowerY: lower.y,
    anchorIsUpper,
    moveTargetId: moveTarget.id,
    editable: !moveTarget.locked,
  }
}

export default function PanelCanvas({
  canvasRef,
  panelWidth,
  panelHeight,
  scale,
  placedComponents,
  selectedIds,
  overlappingIds,
  dragGhost,
  onSelect,
  onSelectByIds,
  onClearSelection,
  onToggleLock,
  onMoveComponentBy,
  onResizeComponent,
  gridSnapEnabled,
  useFraction,
  railMeasureMode,
  lastPlacement,
  onRepeatPlacement,
  anchorId,
}) {
  const { marqueeRect, handlePointerDown } = useMarqueeSelect({
    canvasRef,
    placedComponents,
    scale,
    onSelect: onSelectByIds,
  })

  const { resizeGhost, startResize } = useResizeHandle({
    placedComponents,
    scale,
    panelWidth,
    panelHeight,
    gridSnapEnabled,
    onResize: onResizeComponent,
  })

  if (scale <= 0) return null

  const measuredComponents = getMeasuredComponents(placedComponents, selectedIds, dragGhost, railMeasureMode)
  const measuredRails = measuredComponents.filter((c) => c.isRail)
  const selectionGap = getSelectionGap(placedComponents, selectedIds, dragGhost, anchorId)
  const formatInches = (value) => formatInchesValue(value, useFraction)

  function handleEditGap(newGap) {
    if (!selectionGap) return
    const { anchorIsUpper, upperY, upperHeight, lowerY, moveTargetId } = selectionGap
    const deltaY = anchorIsUpper ? upperY + upperHeight + newGap - lowerY : lowerY - newGap - upperHeight - upperY
    onMoveComponentBy(moveTargetId, 0, deltaY)
  }

  return (
    <div
      ref={canvasRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClearSelection()
      }}
      onPointerDown={handlePointerDown}
      className="relative border border-neutral-500"
      style={{
        width: panelWidth * scale,
        height: panelHeight * scale,
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: `${scale}px ${scale}px`,
      }}
    >
      {[...placedComponents]
        .sort((a, b) => (a.isRail === b.isRail ? 0 : a.isRail ? -1 : 1))
        .map((component) => {
          const rect = getRenderRect(component, dragGhost, resizeGhost)
          return (
            <PlacedComponent
              key={component.id}
              component={component}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              scale={scale}
              selected={selectedIds.has(component.id)}
              overlapping={overlappingIds.has(component.id)}
              resizing={resizeGhost?.id === component.id}
              onSelect={onSelect}
              onStartResize={startResize}
            />
          )
        })}

      {placedComponents
        .filter((c) => c.isRail)
        .map((rail) => {
          const rect = getRenderRect(rail, dragGhost, resizeGhost)
          return (
            <RailDragHandle
              key={rail.id}
              rail={rail}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              scale={scale}
              selected={selectedIds.has(rail.id)}
              onSelect={onSelect}
              onToggleLock={onToggleLock}
              onStartResize={startResize}
            />
          )
        })}

      {dragGhost?.snappedRailId &&
        (() => {
          const rail = placedComponents.find((c) => c.id === dragGhost.snappedRailId)
          if (!rail) return null
          const centerY = rail.y + getEffectiveSize(rail).height / 2
          return (
            <div
              className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-amber-400"
              style={{ top: centerY * scale }}
            />
          )
        })()}

      {dragGhost?.type === 'new' &&
        Array.from({ length: Math.max(1, dragGhost.quantity ?? 1) }, (_, i) => (
          <div
            key={i}
            className="pointer-events-none absolute border-2 border-dashed border-white/70"
            style={{
              left: (dragGhost.x + i * dragGhost.width) * scale,
              top: dragGhost.y * scale,
              width: dragGhost.width * scale,
              height: dragGhost.height * scale,
              backgroundColor: dragGhost.component.color,
              opacity: 0.5,
            }}
          />
        ))}

      {measuredComponents.map((part, i) => (
        <PartDimensionGuides
          key={i}
          part={part}
          panelWidth={panelWidth}
          scale={scale}
          useFraction={useFraction}
          editable={part.editable}
          onEditMeasure={(newValue) => {
            const offset = part.measureY - part.y
            const newY = Math.min(Math.max(newValue - offset, 0), Math.max(0, panelHeight - part.height))
            onMoveComponentBy(part.id, 0, newY - part.y)
          }}
          onEditLeftGap={(newValue) => {
            const newX = Math.min(Math.max(newValue, 0), Math.max(0, panelWidth - part.width))
            onMoveComponentBy(part.id, newX - part.x, 0)
          }}
          onEditRightGap={(newValue) => {
            const newX = Math.min(
              Math.max(panelWidth - part.width - newValue, 0),
              Math.max(0, panelWidth - part.width),
            )
            onMoveComponentBy(part.id, newX - part.x, 0)
          }}
        />
      ))}

      {measuredRails.some((rail) => Math.abs(rail.y + rail.height / 2 - panelHeight / 2) < 0.02) && (
        <div
          className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-amber-400"
          style={{ top: (panelHeight / 2) * scale }}
        />
      )}

      {measuredRails.some((rail) => Math.abs(rail.x + rail.width / 2 - panelWidth / 2) < 0.02) && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-amber-400"
          style={{ left: (panelWidth / 2) * scale }}
        />
      )}

      {selectionGap && (
        <>
          <div
            className="pointer-events-none absolute border-l border-dashed border-sky-400"
            style={{ left: selectionGap.lineX * scale, top: selectionGap.topY * scale, height: selectionGap.gap * scale }}
          />
          <EditableLabel
            value={selectionGap.gap}
            editable={selectionGap.editable}
            onCommit={handleEditGap}
            formatInches={formatInches}
            textColorClass="text-sky-300"
            borderColorClass="border-sky-400"
            style={{
              left: selectionGap.lineX * scale,
              top: (selectionGap.topY + selectionGap.gap / 2) * scale,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </>
      )}

      {lastPlacement &&
        (() => {
          const BUTTON = 24
          const left = Math.min(lastPlacement.nextX * scale, panelWidth * scale - BUTTON)
          const top = Math.min(
            (lastPlacement.y + lastPlacement.component.height / 2) * scale - BUTTON / 2,
            panelHeight * scale - BUTTON,
          )
          return (
            <button
              type="button"
              onClick={onRepeatPlacement}
              title={`Add ${lastPlacement.quantity} more ${lastPlacement.component.name}`}
              className="absolute z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-sm leading-none font-bold text-white shadow-lg hover:bg-blue-500"
              style={{ left, top }}
            >
              +
            </button>
          )
        })()}

      {marqueeRect && (
        <div
          className={
            marqueeRect.mode === 'window'
              ? 'pointer-events-none absolute z-30 border border-blue-400 bg-blue-400/15'
              : 'pointer-events-none absolute z-30 border border-dashed border-emerald-400 bg-emerald-400/10'
          }
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}
    </div>
  )
}
