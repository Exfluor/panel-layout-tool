import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'
import { parseDimensionToInches } from '../lib/units'

const emptyDraft = { name: '', width: '', height: '', color: '#3b82f6', isRail: false }

function ComponentForm({ draft, onChange, onSubmit, onCancel, submitLabel }) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded border border-neutral-600 bg-neutral-900 p-2"
    >
      <input
        type="text"
        placeholder="Name"
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        className="w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm outline-none focus:border-blue-500"
        autoFocus
      />
      <div className="flex gap-2">
        <label className="w-1/2 text-xs text-neutral-400">
          Width (in)
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 3, 2 1/2, or 76mm"
            value={draft.width}
            onChange={(e) => onChange({ ...draft, width: e.target.value })}
            className="mt-0.5 w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          />
        </label>
        <label className="w-1/2 text-xs text-neutral-400">
          Height (in)
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 3, 2 1/2, or 76mm"
            value={draft.height}
            onChange={(e) => onChange({ ...draft, height: e.target.value })}
            className="mt-0.5 w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          />
        </label>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-neutral-300">
        <input
          type="checkbox"
          checked={draft.isRail}
          onChange={(e) => onChange({ ...draft, isRail: e.target.checked })}
        />
        Mounting rail (e.g. DIN rail) &mdash; parts placed on it won't flag as overlapping
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={draft.color}
          onChange={(e) => onChange({ ...draft, color: e.target.value })}
          className="h-7 w-9 shrink-0 cursor-pointer rounded border border-neutral-600 bg-neutral-800"
        />
        <div className="flex flex-1 gap-1.5">
          <button
            type="submit"
            className="flex-1 rounded bg-blue-600 py-1 text-sm font-medium hover:bg-blue-500"
          >
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded border border-neutral-600 py-1 text-sm hover:bg-neutral-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

function ComponentRow({ component, onUpdate, onDelete, onDuplicate }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${component.id}`,
    data: { type: 'library', component, quantity },
  })

  function startEdit() {
    setDraft({
      name: component.name,
      width: String(component.width),
      height: String(component.height),
      color: component.color,
      isRail: component.isRail ?? false,
    })
    setEditing(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const width = parseDimensionToInches(draft.width)
    const height = parseDimensionToInches(draft.height)
    if (!draft.name.trim() || !(width > 0) || !(height > 0)) return

    onUpdate(component.id, {
      name: draft.name.trim(),
      width,
      height,
      color: draft.color,
      isRail: draft.isRail,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <ComponentForm
        draft={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        onCancel={() => setEditing(false)}
        submitLabel="Save"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group rounded px-2 py-1.5 hover:bg-neutral-800 ${isDragging ? 'opacity-40' : ''}`}
      style={{ cursor: 'grab', touchAction: 'none' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/20"
          style={{ backgroundColor: component.color }}
        />
        <div className="min-w-0 flex-1 text-sm break-words">
          {component.name}
          {component.isRail && (
            <span className="ml-1.5 rounded bg-neutral-700 px-1 py-0.5 text-[10px] font-medium text-neutral-300">
              RAIL
            </span>
          )}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 pl-5">
        <span className="text-xs text-neutral-400">
          {component.width}&Prime; &times; {component.height}&Prime;
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            onPointerDown={(e) => e.stopPropagation()}
            title="Quantity to place per drag"
            className="w-11 rounded border border-neutral-600 bg-neutral-800 px-1 py-0.5 text-center text-xs outline-none focus:border-blue-500"
          />
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={startEdit}
              className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-700"
              title="Edit"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(component)}
              className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-700"
              title="Duplicate"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onDelete(component.id)}
              className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-neutral-700"
              title="Delete"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ComponentLibrarySidebar({ library, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)

  function handleAddSubmit(e) {
    e.preventDefault()
    const width = parseDimensionToInches(draft.width)
    const height = parseDimensionToInches(draft.height)
    if (!draft.name.trim() || !(width > 0) || !(height > 0)) return

    onAdd({ name: draft.name.trim(), width, height, color: draft.color, isRail: draft.isRail })
    setDraft(emptyDraft)
    setAdding(false)
  }

  function handleDuplicate(component) {
    onAdd({
      name: `${component.name} (copy)`,
      width: component.width,
      height: component.height,
      color: component.color,
      isRail: component.isRail ?? false,
    })
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-neutral-700 bg-neutral-800/60">
      <div className="flex items-center justify-between border-b border-neutral-700 px-3 py-2.5">
        <h2 className="text-sm font-semibold">Components</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft)
              setAdding(true)
            }}
            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium hover:bg-blue-500"
          >
            + Add
          </button>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {adding && (
          <ComponentForm
            draft={draft}
            onChange={setDraft}
            onSubmit={handleAddSubmit}
            onCancel={() => setAdding(false)}
            submitLabel="Add"
          />
        )}
        {library.map((component) => (
          <ComponentRow
            key={component.id}
            component={component}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
        {library.length === 0 && !adding && (
          <p className="px-2 py-4 text-center text-xs text-neutral-500">
            No components yet. Add one to get started.
          </p>
        )}
      </div>
    </aside>
  )
}
