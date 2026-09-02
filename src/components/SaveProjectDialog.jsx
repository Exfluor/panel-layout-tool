import { useState } from 'react'

export default function SaveProjectDialog({ initialName, onSave, onCancel }) {
  const [name, setName] = useState(initialName ?? '')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-5"
      >
        <h2 className="mb-3 text-sm font-semibold">Save panel as&hellip;</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          autoFocus
          className="mb-4 w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded bg-blue-600 py-1.5 text-sm font-medium hover:bg-blue-500"
          >
            Save
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
