import { useDraggable } from '@dnd-kit/core'
import { useLayoutEffect, useRef, useState } from 'react'
import { isDarkColor } from '../lib/color'
import { getResizableEdges } from '../lib/geometry'

const HANDLE_THICKNESS = 8

function ResizeHandle({ edge, onStartResize }) {
  const isHorizontal = edge === 'left' || edge === 'right'
  const edgeStyle =
    edge === 'left'
      ? { left: -HANDLE_THICKNESS / 2, top: 0, bottom: 0, width: HANDLE_THICKNESS }
      : edge === 'right'
        ? { right: -HANDLE_THICKNESS / 2, top: 0, bottom: 0, width: HANDLE_THICKNESS }
        : edge === 'top'
          ? { top: -HANDLE_THICKNESS / 2, left: 0, right: 0, height: HANDLE_THICKNESS }
          : { bottom: -HANDLE_THICKNESS / 2, left: 0, right: 0, height: HANDLE_THICKNESS }

  return (
    <div
      onPointerDown={onStartResize}
      onClick={(e) => e.stopPropagation()}
      title="Drag to extend or cut"
      className="absolute z-10 hover:bg-blue-400/50"
      style={{ ...edgeStyle, cursor: isHorizontal ? 'ew-resize' : 'ns-resize', touchAction: 'none' }}
    />
  )
}

export default function PlacedComponent({
  component,
  x,
  y,
  width,
  height,
  scale,
  selected,
  overlapping,
  resizing,
  onSelect,
  onStartResize,
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component.id,
    data: { type: 'placed', id: component.id },
    disabled: component.locked,
  })

  const labelRef = useRef(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Re-measures whenever anything that could change the box's on-screen size
  // changes — scale (zoom/resize), rotation/resize (via width/height), or the
  // name itself — so a sliver of a cut-off word never lingers behind, and
  // text that fits again after resizing correctly becomes visible again too.
  useLayoutEffect(() => {
    const el = labelRef.current
    if (!el) return
    setIsTruncated(el.scrollWidth > el.clientWidth + 1)
  }, [component.name, width, height, scale])

  // A dark fill (e.g. black) makes the default dark outline/text disappear
  // into both the component and the canvas background — switch to a light
  // outline/text so the part stays readable regardless of its color.
  const dark = isDarkColor(component.color)
  const textColorClass = dark ? 'text-white/90' : 'text-black/80'

  let borderClass = dark ? 'border border-white/50' : 'border border-black/30'
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
        className={`absolute flex items-center justify-center overflow-hidden text-[10px] font-medium select-none ${textColorClass} ${borderClass} ${isDragging || resizing ? 'opacity-50' : ''}`}
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

        {selected &&
          component.resizable &&
          !component.locked &&
          !component.isRail &&
          !isDragging &&
          getResizableEdges(component).map((edge) => (
            <ResizeHandle key={edge} edge={edge} onStartResize={onStartResize(component, edge)} />
          ))}
      </div>

      {isTruncated && hovered && (
        <div
          className={`pointer-events-none absolute z-20 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-lg ${textColorClass} ${dark ? 'border border-white/50' : 'border border-black/30'}`}
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
