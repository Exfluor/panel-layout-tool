import { useDraggable } from '@dnd-kit/core'
import { getEffectiveSize } from '../lib/geometry'

export default function PlacedComponent({ component, x, y, scale, selected, overlapping, onSelect }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component.id,
    data: { type: 'placed', id: component.id },
  })

  const { width, height } = getEffectiveSize(component)

  let borderClass = 'border border-black/30'
  if (overlapping) borderClass = 'border-2 border-red-500'
  else if (selected) borderClass = 'border-2 border-blue-400'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(component.id, { additive: e.shiftKey })
      }}
      className={`absolute flex items-center justify-center overflow-hidden text-[10px] font-medium text-black/80 select-none ${borderClass} ${isDragging ? 'opacity-50' : ''}`}
      style={{
        left: x * scale,
        top: y * scale,
        width: width * scale,
        height: height * scale,
        backgroundColor: component.color,
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <span className="truncate px-1">{component.name}</span>
    </div>
  )
}
