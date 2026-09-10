import { getBounds, getEffectiveSize } from '../lib/geometry'
import { formatInches } from '../lib/formatInches'
import PartDimensionGuides from './PartDimensionGuides'
import PlacedComponent from './PlacedComponent'
import RailDragHandle from './RailDragHandle'

function getRenderPosition(component, dragGhost) {
  let x = component.x
  let y = component.y
  if (dragGhost?.type === 'move' && dragGhost.groupIds.includes(component.id)) {
    x += dragGhost.deltaX
    y += dragGhost.deltaY
  }
  return { x, y }
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
// e.g. the gap between a Panduit duct and the DIN rail below it.
function getSelectionGap(placedComponents, selectedIds, dragGhost) {
  if (dragGhost || selectedIds.size !== 2) return null
  const [a, b] = [...selectedIds].map((id) => placedComponents.find((c) => c.id === id))
  if (!a || !b) return null

  const boundsA = getBounds(a)
  const boundsB = getBounds(b)
  let upper = null
  let lower = null
  if (boundsA.y + boundsA.height <= boundsB.y + 1e-6) {
    upper = boundsA
    lower = boundsB
  } else if (boundsB.y + boundsB.height <= boundsA.y + 1e-6) {
    upper = boundsB
    lower = boundsA
  } else {
    return null // vertically overlapping — no clean "gap" to show
  }

  const gap = lower.y - (upper.y + upper.height)
  if (gap < 0.01) return null

  const lineX = (upper.x + upper.width / 2 + lower.x + lower.width / 2) / 2
  return { lineX, topY: upper.y + upper.height, gap }
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
  onClearSelection,
  onToggleLock,
  onMoveComponentBy,
  useFraction,
  railMeasureMode,
  lastPlacement,
  onRepeatPlacement,
}) {
  if (scale <= 0) return null

  const measuredComponents = getMeasuredComponents(placedComponents, selectedIds, dragGhost, railMeasureMode)
  const measuredRails = measuredComponents.filter((c) => c.isRail)
  const selectionGap = getSelectionGap(placedComponents, selectedIds, dragGhost)

  return (
    <div
      ref={canvasRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClearSelection()
      }}
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
          const { x: renderX, y: renderY } = getRenderPosition(component, dragGhost)
          return (
            <PlacedComponent
              key={component.id}
              component={component}
              x={renderX}
              y={renderY}
              scale={scale}
              selected={selectedIds.has(component.id)}
              overlapping={overlappingIds.has(component.id)}
              onSelect={onSelect}
            />
          )
        })}

      {placedComponents
        .filter((c) => c.isRail)
        .map((rail) => {
          const { x: renderX, y: renderY } = getRenderPosition(rail, dragGhost)
          return (
            <RailDragHandle
              key={rail.id}
              rail={rail}
              x={renderX}
              y={renderY}
              scale={scale}
              selected={selectedIds.has(rail.id)}
              onSelect={onSelect}
              onToggleLock={onToggleLock}
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
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap text-sky-300"
            style={{
              left: selectionGap.lineX * scale,
              top: (selectionGap.topY + selectionGap.gap / 2) * scale,
            }}
          >
            {formatInches(selectionGap.gap, useFraction)}
          </span>
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
    </div>
  )
}
