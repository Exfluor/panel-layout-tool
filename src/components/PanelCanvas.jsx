import { getEffectiveSize } from '../lib/geometry'
import PlacedComponent from './PlacedComponent'

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
}) {
  if (scale <= 0) return null

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
          let renderX = component.x
          let renderY = component.y
          if (dragGhost?.type === 'move' && dragGhost.groupIds.includes(component.id)) {
            renderX += dragGhost.deltaX
            renderY += dragGhost.deltaY
          }

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

      {dragGhost?.type === 'new' && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-white/70"
          style={{
            left: dragGhost.x * scale,
            top: dragGhost.y * scale,
            width: dragGhost.width * scale,
            height: dragGhost.height * scale,
            backgroundColor: dragGhost.component.color,
            opacity: 0.5,
          }}
        />
      )}
    </div>
  )
}
