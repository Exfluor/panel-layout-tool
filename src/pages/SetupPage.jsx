import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SetupPage() {
  const navigate = useNavigate()
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const w = Number(width)
    const h = Number(height)

    if (!(w > 0) || !(h > 0)) {
      setError('Enter a width and height greater than 0.')
      return
    }

    navigate('/canvas', { state: { panelWidth: w, panelHeight: h } })
  }

  return (
    <div className="flex h-full items-center justify-center bg-neutral-900 text-neutral-100">
      <form
        onSubmit={handleSubmit}
        className="w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-6"
      >
        <h1 className="mb-1 text-lg font-semibold">Panel Builder</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Enter the enclosure's internal dimensions in inches.
        </p>

        <label className="mb-3 block text-sm">
          Internal width (in)
          <input
            type="number"
            min="0"
            step="any"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 outline-none focus:border-blue-500"
            autoFocus
          />
        </label>

        <label className="mb-4 block text-sm">
          Internal height (in)
          <input
            type="number"
            min="0"
            step="any"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          className="w-full rounded bg-blue-600 py-2 font-medium hover:bg-blue-500"
        >
          Create panel
        </button>
      </form>
    </div>
  )
}
