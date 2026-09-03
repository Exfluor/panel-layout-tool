import { useDraggable } from '@dnd-kit/core'
import { getEffectiveSize } from '../lib/geometry'

const STRIP = 6 // px — width of the clickable/draggable border band

export default function RailDragHandle({ rail, x, y, scale, selected, onSelect }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `rail-handle:${rail.id}`,
    data: { type: 'placed', id: rail.id },
  })

  const { width, height } = getEffectiveSize(rail)
  const color = selected ? '#60a5fa' : 'rgba(255,255,255,0.85)'

  const stripBase = {
    ...listeners,
    ...attributes,
    onClick: (e) => {
      e.stopPropagation()
      onSelect(rail.id, { additive: e.shiftKey })
    },
    className: 'pointer-events-auto absolute',
    style: { cursor: 'grab', touchAction: 'none' },
  }

  return (
    <div
      ref={setNodeRef}
      className="pointer-events-none absolute"
      style={{ left: x * scale, top: y * scale, width: width * scale, height: height * scale }}
    >
      <div
        {...stripBase}
        style={{ ...stripBase.style, left: 0, top: 0, width: '100%', height: STRIP, borderTop: `2px dashed ${color}` }}
      />
      <div
        {...stripBase}
        style={{ ...stripBase.style, left: 0, bottom: 0, width: '100%', height: STRIP, borderBottom: `2px dashed ${color}` }}
      />
      <div
        {...stripBase}
        style={{ ...stripBase.style, left: 0, top: 0, width: STRIP, height: '100%', borderLeft: `2px dashed ${color}` }}
      />
      <div
        {...stripBase}
        style={{ ...stripBase.style, right: 0, top: 0, width: STRIP, height: '100%', borderRight: `2px dashed ${color}` }}
      />
    </div>
  )
}
