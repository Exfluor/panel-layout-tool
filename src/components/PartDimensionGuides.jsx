import { useState } from 'react'
import { formatInches as formatInchesValue } from '../lib/formatInches'
import { parseDimensionToInches } from '../lib/units'

const EPSILON = 0.01

function EditableLabel({ value, editable, onCommit, formatInches, style }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const baseClassName = 'absolute rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap text-emerald-300'

  if (editing) {
    function commit() {
      const parsed = parseDimensionToInches(draft)
      if (parsed !== null && parsed >= 0) onCommit(parsed)
      setEditing(false)
    }

    return (
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        value={draft}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') setEditing(false)
        }}
        onBlur={commit}
        className={`${baseClassName} pointer-events-auto z-20 w-14 border border-emerald-400 text-center text-neutral-100 outline-none`}
        style={style}
      />
    )
  }

  return (
    <span
      onClick={
        editable
          ? (e) => {
              e.stopPropagation()
              setDraft(String(Math.round(value * 1000) / 1000))
              setEditing(true)
            }
          : undefined
      }
      title={editable ? 'Click to type an exact value' : undefined}
      className={`${baseClassName} ${editable ? 'pointer-events-auto cursor-text hover:underline' : 'pointer-events-none'}`}
      style={style}
    >
      {formatInches(value)}
    </span>
  )
}

// `measureY` is what the vertical guide measures/labels: a rail's centerline
// (parts mount centered on it, and grid-snap targets that same centerline),
// or a regular part's top edge otherwise. The horizontal gap lines are drawn
// through the part's true geometric center regardless, purely for placement.
// When `editable`, clicking any label turns it into a text input — typing a
// value and hitting Enter (or clicking away) moves the part to match.
export default function PartDimensionGuides({
  part,
  panelWidth,
  scale,
  useFraction = true,
  editable = false,
  onEditMeasure,
  onEditLeftGap,
  onEditRightGap,
}) {
  const formatInches = (value) => formatInchesValue(value, useFraction)
  const centerX = part.x + part.width / 2
  const centerY = part.y + part.height / 2
  const measureY = part.measureY ?? centerY
  const rightGap = panelWidth - (part.x + part.width)

  return (
    <>
      <div
        className="pointer-events-none absolute border-l border-dashed border-emerald-400"
        style={{ left: centerX * scale, top: 0, height: measureY * scale }}
      />
      <EditableLabel
        value={measureY}
        editable={editable}
        onCommit={onEditMeasure}
        formatInches={formatInches}
        style={{ left: centerX * scale, top: (measureY * scale) / 2, transform: 'translate(-50%, -50%)' }}
      />

      {part.x > EPSILON && (
        <>
          <div
            className="pointer-events-none absolute border-t border-dashed border-emerald-400"
            style={{ left: 0, top: centerY * scale, width: part.x * scale }}
          />
          <EditableLabel
            value={part.x}
            editable={editable}
            onCommit={onEditLeftGap}
            formatInches={formatInches}
            style={{ left: (part.x * scale) / 2, top: centerY * scale, transform: 'translate(-50%, -100%)' }}
          />
        </>
      )}

      {rightGap > EPSILON && (
        <>
          <div
            className="pointer-events-none absolute border-t border-dashed border-emerald-400"
            style={{ left: (part.x + part.width) * scale, top: centerY * scale, width: rightGap * scale }}
          />
          <EditableLabel
            value={rightGap}
            editable={editable}
            onCommit={onEditRightGap}
            formatInches={formatInches}
            style={{
              left: (part.x + part.width) * scale + (rightGap * scale) / 2,
              top: centerY * scale,
              transform: 'translate(-50%, -100%)',
            }}
          />
        </>
      )}
    </>
  )
}
