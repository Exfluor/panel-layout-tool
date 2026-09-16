import { useState } from 'react'

export default function BuildSheetOptionsDialog({ initialIncludeBOM, onConfirm, onCancel }) {
  const [includeBOM, setIncludeBOM] = useState(initialIncludeBOM)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm(includeBOM)
        }}
        className="w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-5"
      >
        <h2 className="mb-3 text-sm font-semibold">Build sheet options</h2>
        <label className="mb-4 flex items-center gap-1.5 text-sm text-neutral-300">
          <input type="checkbox" checked={includeBOM} onChange={(e) => setIncludeBOM(e.target.checked)} />
          Include Bill of Materials
        </label>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded bg-blue-600 py-1.5 text-sm font-medium hover:bg-blue-500">
            Continue
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded border border-neutral-600 py-1.5 text-sm hover:bg-neutral-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
