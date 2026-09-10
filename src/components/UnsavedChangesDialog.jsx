export default function UnsavedChangesDialog({ onSave, onDiscard, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-5 text-neutral-100">
        <h2 className="mb-2 text-sm font-semibold">You have unsaved changes</h2>
        <p className="mb-4 text-sm text-neutral-400">Save this panel before leaving, or discard the changes?</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded bg-blue-600 py-1.5 text-sm font-medium hover:bg-blue-500"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded border border-neutral-600 py-1.5 text-sm text-red-400 hover:bg-neutral-700"
          >
            Discard changes
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-neutral-600 py-1.5 text-sm hover:bg-neutral-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
