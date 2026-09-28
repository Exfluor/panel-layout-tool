import { useState } from 'react'
import { parseDimensionToInches } from '../lib/units'

export default function AddDoorDialog({ onAdd, onCancel }) {
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const w = parseDimensionToInches(width)
    const h = parseDimensionToInches(height)
    if (!(w > 0) || !(h > 0)) {
      setError('Enter a width and height greater than 0 (e.g. 24, 24in, or 610mm).')
      return
    }
    onAdd(w, h)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-5"
      >
        <h2 className="mb-1 text-sm font-semibold">Add a door</h2>
        <p className="mb-3 text-xs text-neutral-400">
          The door gets its own canvas within this project, with its own layout and rail
          measurements &mdash; separate from the panel body.
        </p>

        <label className="mb-3 block text-sm">
          Door width (in)
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 24, 2 1/2, or 610mm"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>

        <label className="mb-4 block text-sm">
          Door height (in)
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 20, 2 1/2, or 508mm"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded bg-blue-600 py-1.5 text-sm font-medium hover:bg-blue-500"
          >
            Add door
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
