import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImportConflictDialog from '../components/ImportConflictDialog'
import { useLocalStorageState } from '../hooks/useLocalStorageState'
import { dedupeProjectName, exportProjectToFile, parseProjectFile } from '../lib/projectFile'
import { parseDimensionToInches } from '../lib/units'

function formatUpdatedAt(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function SetupPage() {
  const navigate = useNavigate()
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [error, setError] = useState('')
  const [importError, setImportError] = useState('')
  const [projects, setProjects] = useLocalStorageState('panelBuilder.projects', [])
  const [pendingImport, setPendingImport] = useState(null)
  const fileInputRef = useRef(null)

  const sortedProjects = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  function handleSubmit(e) {
    e.preventDefault()
    const w = parseDimensionToInches(width)
    const h = parseDimensionToInches(height)

    if (!(w > 0) || !(h > 0)) {
      setError('Enter a width and height greater than 0 (e.g. 24, 24in, or 610mm).')
      return
    }

    navigate('/canvas', { state: { panelWidth: w, panelHeight: h } })
  }

  function handleLoad(project) {
    navigate('/canvas', {
      state: { projectId: project.id, panelWidth: project.panelWidth, panelHeight: project.panelHeight },
    })
  }

  function handleDeleteProject(id, e) {
    e.stopPropagation()
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  function handleExportProject(project, e) {
    e.stopPropagation()
    exportProjectToFile(project)
  }

  function handleImportClick() {
    setImportError('')
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const project = parseProjectFile(reader.result)
        const conflict = projects.find(
          (p) => p.name.trim().toLowerCase() === project.name.trim().toLowerCase(),
        )
        setImportError('')
        if (conflict) {
          setPendingImport({ project, conflict })
        } else {
          commitImport(project)
        }
      } catch (err) {
        setImportError(err.message)
      }
    }
    reader.onerror = () => setImportError('Could not read that file.')
    reader.readAsText(file)
  }

  function commitImport(project) {
    setProjects((prev) => [...prev, project])
    handleLoad(project)
  }

  function handleOverwriteImport() {
    const { project, conflict } = pendingImport
    const merged = { ...project, id: conflict.id, createdAt: conflict.createdAt, updatedAt: new Date().toISOString() }
    setProjects((prev) => prev.map((p) => (p.id === conflict.id ? merged : p)))
    setPendingImport(null)
    handleLoad(merged)
  }

  function handleKeepBothImport() {
    const { project } = pendingImport
    const name = dedupeProjectName(project.name, projects.map((p) => p.name))
    setPendingImport(null)
    commitImport({ ...project, name })
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-neutral-900 p-6 text-neutral-100">
      <div className="w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your projects</h2>
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded border border-neutral-600 px-2 py-1 text-xs hover:bg-neutral-700"
          >
            Import file&hellip;
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {importError && <p className="mb-2 text-xs text-red-400">{importError}</p>}

        {sortedProjects.length === 0 ? (
          <p className="py-2 text-center text-xs text-neutral-500">
            No saved projects yet. Create one below, or import a file.
          </p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {sortedProjects.map((project) => (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => handleLoad(project)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoad(project)}
                className="group flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left hover:bg-neutral-700"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">{project.name}</div>
                  <div className="text-xs text-neutral-400">
                    {project.panelWidth}&Prime; &times; {project.panelHeight}&Prime; &middot;{' '}
                    {formatUpdatedAt(project.updatedAt)}
                  </div>
                </div>
                <div className="ml-2 flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => handleExportProject(project, e)}
                    className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-neutral-600"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-neutral-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-80 rounded-lg border border-neutral-700 bg-neutral-800 p-6"
      >
        <h1 className="mb-1 text-lg font-semibold">Panel Builder</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Enter the enclosure's internal dimensions. Defaults to inches &mdash; type mm or cm to
          convert (e.g. 610mm).
        </p>

        <label className="mb-3 block text-sm">
          Internal width (in)
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 24 or 610mm"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 outline-none focus:border-blue-500"
            autoFocus
          />
        </label>

        <label className="mb-4 block text-sm">
          Internal height (in)
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 20 or 508mm"
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

      {pendingImport && (
        <ImportConflictDialog
          name={pendingImport.conflict.name}
          onOverwrite={handleOverwriteImport}
          onKeepBoth={handleKeepBothImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </div>
  )
}
