import { useDraggable } from '@dnd-kit/core'
import { useLayoutEffect, useRef, useState } from 'react'
import { getEffectiveSize } from '../lib/geometry'

export default function PlacedComponent({ component, x, y, scale, selected, overlapping, onSelect }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component.id,
    data: { type: 'placed', id: component.id },
    disabled: component.locked,
  })

  const labelRef = useRef(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { width, height } = getEffectiveSize(component)

  // Re-measures whenever anything that could change the box's on-screen size
  // changes — scale (zoom/resize), rotation (via width/height), or the name
  // itself — so a sliver of a cut-off word never lingers behind, and text
  // that fits again after resizing correctly becomes visible again too.
  useLayoutEffect(() => {
    const el = labelRef.current
    if (!el) return
    setIsTruncated(el.scrollWidth > el.clientWidth + 1)
  }, [component.name, width, height, scale])

  let borderClass = 'border border-black/30'
  if (overlapping) borderClass = 'border-2 border-red-500'
  else if (selected) borderClass = 'border-2 border-blue-400'

  const boxWidth = width * scale
  const boxHeight = height * scale

  return (
    <>
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(component.id, { additive: e.shiftKey })
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={`absolute flex items-center justify-center overflow-hidden text-[10px] font-medium text-black/80 select-none ${borderClass} ${isDragging ? 'opacity-50' : ''}`}
        style={{
          left: x * scale,
          top: y * scale,
          width: boxWidth,
          height: boxHeight,
          backgroundColor: component.color,
          cursor: component.locked ? 'not-allowed' : 'grab',
          touchAction: 'none',
        }}
      >
        <span ref={labelRef} className={`truncate px-1 ${isTruncated ? 'invisible' : ''}`}>
          {component.name}
        </span>
      </div>

      {isTruncated && hovered && (
        <div
          className="pointer-events-none absolute z-20 rounded border border-black/30 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-black/80 shadow-lg"
          style={{
            left: x * scale + boxWidth / 2,
            top: y * scale - 4,
            transform: 'translate(-50%, -100%)',
            backgroundColor: component.color,
          }}
        >
          {component.name}
        </div>
      )}
    </>
  )
}
