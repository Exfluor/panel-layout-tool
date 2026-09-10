import { useDraggable } from '@dnd-kit/core'
import { getEffectiveSize } from '../lib/geometry'

const STRIP = 6 // px — width of the clickable/draggable border band

function LockIcon({ locked }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="9" rx="1.5" />
      {locked ? <path d="M8 11V7a4 4 0 0 1 8 0v4" /> : <path d="M8 11V7a4 4 0 0 1 7-3.5" />}
    </svg>
  )
}

export default function RailDragHandle({ rail, x, y, scale, selected, onSelect, onToggleLock }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `rail-handle:${rail.id}`,
    data: { type: 'placed', id: rail.id },
    disabled: rail.locked,
  })

  const { width, height } = getEffectiveSize(rail)
  const color = rail.locked ? '#f59e0b' : selected ? '#60a5fa' : 'rgba(255,255,255,0.85)'

  const stripBase = {
    ...listeners,
    ...attributes,
    onClick: (e) => {
      e.stopPropagation()
      onSelect(rail.id, { additive: e.shiftKey })
    },
    className: 'pointer-events-auto absolute',
    style: { cursor: rail.locked ? 'not-allowed' : 'grab', touchAction: 'none' },
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

      {selected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock(rail.id)
          }}
          title={rail.locked ? 'Unlock rail' : 'Lock rail in place'}
          className="pointer-events-auto absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-500 bg-neutral-900 text-neutral-100 shadow hover:bg-neutral-700"
          style={{ right: -10, top: -10 }}
        >
          <LockIcon locked={rail.locked} />
        </button>
      )}

      {!selected && rail.locked && (
        <div
          className="pointer-events-none absolute flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900/90 text-amber-400"
          style={{ right: -8, top: -8 }}
        >
          <LockIcon locked />
        </div>
      )}
    </div>
  )
}
