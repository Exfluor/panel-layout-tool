import { useState } from 'react'
import { parseDimensionToInches } from '../lib/units'

// A small floating label that becomes a text input on click — type a value
// and hit Enter (or click away) to commit it via onCommit. Used anywhere a
// displayed measurement should double as a way to set that measurement
// directly (dimension guides, the gap distance between two selections, etc).
export default function EditableLabel({
  value,
  editable,
  onCommit,
  formatInches,
  style,
  textColorClass = 'text-emerald-300',
  borderColorClass = 'border-emerald-400',
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const baseClassName = `absolute rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap ${textColorClass}`

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
        className={`${baseClassName} pointer-events-auto z-20 w-14 border ${borderColorClass} text-center text-neutral-100 outline-none`}
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
