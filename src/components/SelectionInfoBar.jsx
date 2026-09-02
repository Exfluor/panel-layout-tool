export default function SelectionInfoBar({ placedComponents, selectedIds, onDelete, onRotate, onGroup, onUngroup }) {
  const selected = placedComponents.filter((c) => selectedIds.has(c.id))
  if (selected.length === 0) {
    return (
      <div className="flex items-center justify-center border-t border-neutral-700 px-4 py-2 text-xs text-neutral-500">
        Click a placed component to select it. Delete/R to remove or rotate.
      </div>
    )
  }

  const groupId = selected[0].groupId
  const isFullExistingGroup =
    groupId !== null &&
    selected.every((c) => c.groupId === groupId) &&
    placedComponents.filter((c) => c.groupId === groupId).length === selected.length

  return (
    <div className="flex items-center justify-between border-t border-neutral-700 px-4 py-2 text-sm">
      <div className="text-neutral-300">
        {selected.length === 1 ? (
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
