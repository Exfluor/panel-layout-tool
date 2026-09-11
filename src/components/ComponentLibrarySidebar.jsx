import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useState } from 'react'
import { exportLibraryToFile, parseLibraryFile } from '../lib/libraryFile'
import { parseDimensionToInches } from '../lib/units'

export const UNCATEGORIZED_DROP_ID = '__uncategorized__'

function GripIcon(props) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" {...props}>
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  )
}

const emptyDraft = { name: '', width: '', height: '', color: '#3b82f6', isRail: false, folderId: null }

function ComponentForm({ draft, onChange, onSubmit, onCancel, submitLabel, folders }) {
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
      {folders.length > 0 && (
        <label className="block text-xs text-neutral-400">
          Folder
          <select
            value={draft.folderId ?? ''}
            onChange={(e) => onChange({ ...draft, folderId: e.target.value || null })}
            className="mt-0.5 w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-blue-500"
          >
            <option value="">Uncategorized</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      )}
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

function ComponentRow({ component, onUpdate, onDelete, onDuplicate, folders }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${component.id}`,
    data: { type: 'library', component, quantity },
  })
  const {
    attributes: sortAttributes,
    listeners: sortListeners,
    setNodeRef: setSortNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: component.id, data: { type: 'sort' } })

  function startEdit() {
    setDraft({
      name: component.name,
      width: String(component.width),
      height: String(component.height),
      color: component.color,
      isRail: component.isRail ?? false,
      folderId: component.folderId ?? null,
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
      folderId: draft.folderId,
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
        folders={folders}
      />
    )
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        setSortNodeRef(node)
      }}
      {...listeners}
      {...attributes}
      className={`group rounded px-2 py-1.5 hover:bg-neutral-800 ${isDragging ? 'opacity-40' : ''} ${isSorting ? 'z-10 opacity-60' : ''}`}
      style={{ cursor: 'grab', touchAction: 'none', transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...sortAttributes}
          onPointerDown={(e) => {
            e.stopPropagation()
            sortListeners?.onPointerDown?.(e)
          }}
          className="shrink-0 cursor-grab touch-none text-neutral-500 hover:text-neutral-300"
          style={{ touchAction: 'none' }}
          title="Drag to reorder or move into a folder"
        >
          <GripIcon />
        </button>
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

const FOLDER_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#22d3ee', '#fb923c', '#a3e635']

function getFolderColor(index) {
  return FOLDER_COLORS[index % FOLDER_COLORS.length]
}

function FolderHeader({ folder, color, count, onToggleCollapse, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(folder.name)
  const { setNodeRef, isOver } = useDroppable({ id: folder.id, data: { type: 'folder' } })

  if (renaming) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (nameDraft.trim()) onRename(nameDraft.trim())
          setRenaming(false)
        }}
        className="flex items-center gap-1 px-1 py-1"
      >
        <input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs outline-none focus:border-blue-500"
        />
        <button type="submit" className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-500">
          Save
        </button>
        <button
          type="button"
          onClick={() => setRenaming(false)}
          className="rounded border border-neutral-600 px-2 py-1 text-xs hover:bg-neutral-700"
        >
          Cancel
        </button>
      </form>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center justify-between rounded px-1 py-1 ${isOver ? 'bg-blue-500/20 ring-1 ring-blue-400' : 'hover:bg-neutral-800/60'}`}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <span className="inline-block w-3 text-neutral-500">{folder.collapsed ? '▸' : '▾'}</span>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-sm font-bold text-neutral-100">{folder.name}</span>
        <span className="text-xs text-neutral-500">({count})</span>
      </button>
      <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setRenaming(true)}
          className="rounded px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-700"
        >
          Rename
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-neutral-700"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function UncategorizedHeader() {
  const { setNodeRef, isOver } = useDroppable({ id: UNCATEGORIZED_DROP_ID, data: { type: 'folder' } })
  return (
    <div
      ref={setNodeRef}
      className={`rounded px-1 py-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase ${isOver ? 'bg-blue-500/20 ring-1 ring-blue-400' : ''}`}
    >
      Uncategorized
    </div>
  )
}

function isSameComponent(a, b) {
  return (
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    a.width === b.width &&
    a.height === b.height &&
    a.color === b.color &&
    Boolean(a.isRail) === Boolean(b.isRail)
  )
}

export default function ComponentLibrarySidebar({ library, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [addingFolder, setAddingFolder] = useState(false)
  const [folderNameDraft, setFolderNameDraft] = useState('')
  const [draft, setDraft] = useState(emptyDraft)
  const [importError, setImportError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef(null)

  const folders = library.filter((item) => item.isFolder)
  const components = library.filter((item) => !item.isFolder)

  function componentsInFolder(folderId) {
    return components.filter((c) => (c.folderId ?? null) === folderId)
  }
  const uncategorized = componentsInFolder(null)

  function handleExportLibrary() {
    exportLibraryToFile(library)
  }

  function handleImportClick() {
    setImportError('')
    setImportMessage('')
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseLibraryFile(reader.result)
        const newOnes = imported.filter((c) => !components.some((existing) => isSameComponent(c, existing)))
        newOnes.forEach((c) => onAdd(c))

        setImportError('')
        const skipped = imported.length - newOnes.length
        setImportMessage(
          skipped > 0
            ? `Imported ${newOnes.length} new component${newOnes.length === 1 ? '' : 's'}; skipped ${skipped} already in your library.`
            : `Imported ${newOnes.length} component${newOnes.length === 1 ? '' : 's'}.`,
        )
      } catch (err) {
        setImportMessage('')
        setImportError(err.message)
      }
    }
    reader.onerror = () => {
      setImportMessage('')
      setImportError('Could not read that file.')
    }
    reader.readAsText(file)
  }

  function handleAddSubmit(e) {
    e.preventDefault()
    const width = parseDimensionToInches(draft.width)
    const height = parseDimensionToInches(draft.height)
    if (!draft.name.trim() || !(width > 0) || !(height > 0)) return

    onAdd({
      name: draft.name.trim(),
      width,
      height,
      color: draft.color,
      isRail: draft.isRail,
      folderId: draft.folderId,
    })
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
      folderId: component.folderId ?? null,
    })
  }

  function handleAddFolder(e) {
    e.preventDefault()
    if (!folderNameDraft.trim()) return
    onAdd({ isFolder: true, name: folderNameDraft.trim(), collapsed: false })
    setFolderNameDraft('')
    setAddingFolder(false)
  }

  function handleDeleteFolder(folderId) {
    componentsInFolder(folderId).forEach((c) => onUpdate(c.id, { folderId: null }))
    onDelete(folderId)
  }

  function renderRow(component) {
    return (
      <ComponentRow
        key={component.id}
        component={component}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onDuplicate={handleDuplicate}
        folders={folders}
      />
    )
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-neutral-700 bg-neutral-800/60">
      <div className="border-b border-neutral-700 px-3 py-2.5">
        <div className="flex items-center justify-between">
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
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportLibrary}
            title="Download this library as a file you can share"
            className="rounded border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-700"
          >
            Export library
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            title="Add components from someone else's library file"
            className="rounded border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-700"
          >
            Import library&hellip;
          </button>
          {!addingFolder && (
            <button
              type="button"
              onClick={() => setAddingFolder(true)}
              className="rounded border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-700"
            >
              + Folder
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {addingFolder && (
          <form onSubmit={handleAddFolder} className="mt-1.5 flex items-center gap-1">
            <input
              autoFocus
              value={folderNameDraft}
              onChange={(e) => setFolderNameDraft(e.target.value)}
              placeholder="Folder name"
              className="w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-xs outline-none focus:border-blue-500"
            />
            <button type="submit" className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-500">
              Add
            </button>
            <button
              type="button"
              onClick={() => setAddingFolder(false)}
              className="rounded border border-neutral-600 px-2 py-1 text-xs hover:bg-neutral-700"
            >
              Cancel
            </button>
          </form>
        )}
        {importError && <p className="mt-1.5 text-xs text-red-400">{importError}</p>}
        {importMessage && <p className="mt-1.5 text-xs text-neutral-400">{importMessage}</p>}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {adding && (
          <ComponentForm
            draft={draft}
            onChange={setDraft}
            onSubmit={handleAddSubmit}
            onCancel={() => setAdding(false)}
            submitLabel="Add"
            folders={folders}
          />
        )}

        {folders.map((folder, index) => {
          const items = componentsInFolder(folder.id)
          const color = getFolderColor(index)
          return (
            <div key={folder.id} className="mb-1.5">
              <FolderHeader
                folder={folder}
                color={color}
                count={items.length}
                onToggleCollapse={() => onUpdate(folder.id, { collapsed: !folder.collapsed })}
                onRename={(name) => onUpdate(folder.id, { name })}
                onDelete={() => handleDeleteFolder(folder.id)}
              />
              {!folder.collapsed && (
                <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <div
                    className="ml-1.5 space-y-1 border-l-2 py-1 pl-2"
                    style={{ borderColor: color, backgroundColor: `${color}14` }}
                  >
                    {items.length === 0 ? (
                      <p className="px-2 py-2 text-center text-[10px] text-neutral-500">Drag a component here</p>
                    ) : (
                      items.map(renderRow)
                    )}
                  </div>
                </SortableContext>
              )}
            </div>
          )
        })}

        {folders.length > 0 && <UncategorizedHeader />}

        <SortableContext items={uncategorized.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className={folders.length > 0 ? 'space-y-1 pl-2' : 'space-y-1'}>{uncategorized.map(renderRow)}</div>
        </SortableContext>

        {library.length === 0 && !adding && (
          <p className="px-2 py-4 text-center text-xs text-neutral-500">
            No components yet. Add one to get started.
          </p>
        )}
      </div>
    </aside>
  )
}
