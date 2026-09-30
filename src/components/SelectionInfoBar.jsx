import { useState } from 'react'
import { parseDimensionToInches } from '../lib/units'
import AlignMenu from './AlignMenu'

function FontHeightInput({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const parsed = parseDimensionToInches(draft)
    if (parsed !== null && parsed > 0) onCommit(parsed)
    else setDraft(String(value))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
          e.target.blur()
        }
      }}
      className="w-14 rounded border border-neutral-600 bg-neutral-900 px-1.5 py-1 text-xs text-neutral-100 outline-none focus:border-blue-500"
    />
  )
}

export default function SelectionInfoBar({
  placedComponents,
  selectedIds,
  onDelete,
  onRotate,
  onGroup,
  onUngroup,
  onCenter,
  onPack,
  onCopy,
  onPaste,
  hasClipboard,
  onEditNameplateText,
  onEditNameplateFontHeight,
  onAlign,
  onDistribute,
}) {
  const selected = placedComponents.filter((c) => selectedIds.has(c.id))
  if (selected.length === 0) {
    return (
      <div className="flex h-11 items-center justify-between border-t border-neutral-700 px-4 text-xs text-neutral-500">
        <span>Click a placed component to select it. Delete/R to remove or rotate.</span>
        {hasClipboard && (
          <button
            type="button"
            onClick={onPaste}
            className="rounded border border-neutral-600 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Paste (Ctrl+V)
          </button>
        )}
      </div>
    )
  }

  const groupId = selected[0].groupId
  const isFullExistingGroup =
    groupId !== null &&
    selected.every((c) => c.groupId === groupId) &&
    placedComponents.filter((c) => c.groupId === groupId).length === selected.length

  return (
    <div className="flex h-11 items-center justify-between border-t border-neutral-700 px-4 text-sm">
      <div className="flex items-center gap-2 text-neutral-300">
        {selected.length === 1 && selected[0].isNameplate ? (
          <>
            <span className="font-medium text-neutral-100">{selected[0].name}</span>
            <input
              type="text"
              value={selected[0].text ?? ''}
              onChange={(e) => onEditNameplateText(selected[0].id, e.target.value)}
              placeholder="Engraved text"
              className="w-44 rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-blue-500"
            />
            <label className="flex items-center gap-1 text-xs text-neutral-400">
              Font height
              <FontHeightInput
                key={selected[0].id}
                value={selected[0].fontHeight ?? 0.25}
                onCommit={(v) => onEditNameplateFontHeight(selected[0].id, v)}
              />
              in
            </label>
          </>
        ) : selected.length === 1 ? (
          <span>
            <span className="font-medium text-neutral-100">{selected[0].name}</span>{' '}
            &mdash; {selected[0].width}&Prime; &times; {selected[0].height}&Prime;, rotated {selected[0].rotation}&deg;
          </span>
        ) : (
          <span>{selected.length} components selected</span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800"
        >
          Copy (Ctrl+C)
        </button>
        {hasClipboard && (
          <button
            type="button"
            onClick={onPaste}
            className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800"
          >
            Paste (Ctrl+V)
          </button>
        )}
        <button
          type="button"
          onClick={onRotate}
          className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800"
        >
          Rotate (R)
        </button>
        {selected.length > 1 &&
          (isFullExistingGroup ? (
            <button
              type="button"
              onClick={onUngroup}
              className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800"
            >
              Ungroup
            </button>
          ) : (
            <button
              type="button"
              onClick={onGroup}
              className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800"
            >
              Group
            </button>
          ))}
        {selected.length > 1 && (
          <button
            type="button"
            onClick={onCenter}
            className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800"
          >
            Center
          </button>
        )}
        {selected.length > 1 && (
          <button
            type="button"
            onClick={onPack}
            title="Slide selected parts flush against each other, closing gaps"
            className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800"
          >
            Pack
          </button>
        )}
        {selected.length > 1 && (
          <AlignMenu
            distributeDisabled={selected.length <= 2}
            onAlign={onAlign}
            onDistribute={onDistribute}
          />
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded border border-red-800 px-3 py-1 text-xs text-red-400 hover:bg-red-950"
        >
          Delete (Del)
        </button>
      </div>
    </div>
  )
}
