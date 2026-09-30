function AlignIcon({ row, justify }) {
  const barClass = row ? 'w-1.5 bg-current' : 'h-1.5 bg-current'
  return (
    <span className={`flex ${row ? 'flex-row' : 'flex-col'} ${justify} gap-0.5`}>
      <span className={`${barClass} ${row ? 'h-2.5' : 'w-3'}`} />
      <span className={`${barClass} ${row ? 'h-4' : 'w-5'}`} />
    </span>
  )
}

// Three unevenly-sized bars with dashed tick marks centered in each gap —
// the ticks are what read as "these two gaps are equal," which plain evenly-
// spaced-looking bars didn't convey on their own.
function DistributeIcon({ row }) {
  if (row) {
    return (
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
        <rect x="0" y="4" width="3" height="6" fill="currentColor" />
        <rect x="7.5" y="2" width="3" height="10" fill="currentColor" />
        <rect x="15" y="4" width="3" height="6" fill="currentColor" />
        <line x1="5.25" y1="1" x2="5.25" y2="13" stroke="currentColor" strokeWidth="1" strokeDasharray="1.3 1.3" />
        <line x1="12.75" y1="1" x2="12.75" y2="13" stroke="currentColor" strokeWidth="1" strokeDasharray="1.3 1.3" />
      </svg>
    )
  }
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
      <rect x="4" y="0" width="6" height="3" fill="currentColor" />
      <rect x="2" y="7.5" width="10" height="3" fill="currentColor" />
      <rect x="4" y="15" width="6" height="3" fill="currentColor" />
      <line x1="1" y1="5.25" x2="13" y2="5.25" stroke="currentColor" strokeWidth="1" strokeDasharray="1.3 1.3" />
      <line x1="1" y1="12.75" x2="13" y2="12.75" stroke="currentColor" strokeWidth="1" strokeDasharray="1.3 1.3" />
    </svg>
  )
}

const ALIGN_ITEMS = [
  { mode: 'left', label: 'Align left', icon: <AlignIcon row={false} justify="items-start" /> },
  { mode: 'hcenter', label: 'Horizontal align center', icon: <AlignIcon row={false} justify="items-center" /> },
  { mode: 'right', label: 'Align right', icon: <AlignIcon row={false} justify="items-end" /> },
  { mode: 'top', label: 'Align top', icon: <AlignIcon row justify="items-start" /> },
  { mode: 'vcenter', label: 'Vertical align center', icon: <AlignIcon row justify="items-center" /> },
  { mode: 'bottom', label: 'Align bottom', icon: <AlignIcon row justify="items-end" /> },
]

// An always-visible row of icon buttons (rather than a dropdown menu) so
// aligning/distributing the current selection is a single click. Align
// operations move every other selected item to match the last-selected
// item's edge/center (handled by the layout hook via anchorId); distribute
// only makes sense with 3+ items, so it's disabled below that.
export default function AlignMenu({ distributeDisabled, onAlign, onDistribute }) {
  const buttonClass =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-300 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="flex items-center gap-0.5 rounded border border-neutral-600 px-1 py-1">
      {ALIGN_ITEMS.map((item) => (
        <button
          key={item.mode}
          type="button"
          title={item.label}
          onClick={() => onAlign(item.mode)}
          className={buttonClass}
        >
          {item.icon}
        </button>
      ))}
      <span className="mx-0.5 h-5 w-px shrink-0 bg-neutral-700" />
      <button
        type="button"
        title="Distribute horizontally"
        disabled={distributeDisabled}
        onClick={() => onDistribute('horizontal')}
        className={buttonClass}
      >
        <DistributeIcon row />
      </button>
      <button
        type="button"
        title="Distribute vertically"
        disabled={distributeDisabled}
        onClick={() => onDistribute('vertical')}
        className={buttonClass}
      >
        <DistributeIcon row={false} />
      </button>
    </div>
  )
}
