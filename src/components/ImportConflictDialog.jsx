export default function ImportConflictDialog({ name, onOverwrite, onKeepBoth, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-5 text-neutral-100">
        <h2 className="mb-2 text-sm font-semibold">A project named &ldquo;{name}&rdquo; already exists</h2>
        <p className="mb-4 text-sm text-neutral-400">
          Overwrite the existing one, or keep both and import this as a separate copy?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onOverwrite}
            className="rounded bg-blue-600 py-1.5 text-sm font-medium hover:bg-blue-500"
          >
            Overwrite existing
          </button>
          <button
            type="button"
            onClick={onKeepBoth}
            className="rounded border border-neutral-600 py-1.5 text-sm hover:bg-neutral-700"
          >
            Keep both (import as copy)
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
