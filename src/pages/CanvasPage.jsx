import { DndContext, DragOverlay } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ComponentLibrarySidebar from '../components/ComponentLibrarySidebar'
import Minimap from '../components/Minimap'
import PanelCanvas from '../components/PanelCanvas'
import PartsListPanel from '../components/PartsListPanel'
import RailExternalRuler, { RULER_WIDTH } from '../components/RailExternalRuler'
import SaveProjectDialog from '../components/SaveProjectDialog'
import SelectionInfoBar from '../components/SelectionInfoBar'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { useCanvasDnd } from '../hooks/useCanvasDnd'
import { useElementSize } from '../hooks/useElementSize'
import { useLocalStorageState } from '../hooks/useLocalStorageState'
import { usePanelLayout } from '../hooks/usePanelLayout'
import { useZoomPan } from '../hooks/useZoomPan'
import { defaultComponents } from '../lib/defaultComponents'
import { computePartsList } from '../lib/partsList'
import { exportProjectToFile } from '../lib/projectFile'

const PADDING = 32

export default function CanvasPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [containerRef, containerSize] = useElementSize()
  const canvasRef = useRef(null)

  const [projects, setProjects] = useLocalStorageState('panelBuilder.projects', [])
  const project = state?.projectId ? projects.find((p) => p.id === state.projectId) : null

  // A loaded project owns its own library snapshot (session-scoped, only
  // written back into the project record on Save). A brand new panel falls
  // back to the persisted global default library, which itself becomes the
  // starting point for the next new panel too.
  const [globalLibrary, setGlobalLibrary] = useLocalStorageState(
    'panelBuilder.componentLibrary',
    defaultComponents,
  )
  const [sessionLibrary, setSessionLibrary] = useState(() => project?.componentLibrary ?? defaultComponents)
  const library = project ? sessionLibrary : globalLibrary
  const setLibrary = project ? setSessionLibrary : setGlobalLibrary

  const [partNotes, setPartNotes] = useState(() => project?.partNotes ?? {})
  const layout = usePanelLayout(project?.placedComponents ?? [])

  const [gridSnapEnabled, setGridSnapEnabled] = useState(true)
  const [useFraction, setUseFraction] = useState(true)
  const [railMeasureMode, setRailMeasureMode] = useState('center')

  const [currentProjectId, setCurrentProjectId] = useState(project?.id ?? null)
  const [currentProjectName, setCurrentProjectName] = useState(project?.name ?? '')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false)
  const navigateAfterSaveRef = useRef(false)
  const lastSavedSnapshotRef = useRef(
    JSON.stringify({
      placedComponents: project?.placedComponents ?? [],
      library: project?.componentLibrary ?? defaultComponents,
      partNotes: project?.partNotes ?? {},
    }),
  )

  const panelWidth = state?.panelWidth ?? 0
  const panelHeight = state?.panelHeight ?? 0

  const availableWidth = containerSize.width - PADDING * 2 - RULER_WIDTH
  const availableHeight = containerSize.height - PADDING * 2
  const fitScale =
    panelWidth > 0 && panelHeight > 0 && availableWidth > 0 && availableHeight > 0
      ? Math.min(availableWidth / panelWidth, availableHeight / panelHeight)
      : 0

  const zoomPan = useZoomPan(containerRef, fitScale)
  const scale = zoomPan.scale
  const isZoomedBeyondFit =
    scale > 0 && (panelWidth * scale > availableWidth || panelHeight * scale > availableHeight)

  const dnd = useCanvasDnd({
    panelWidth,
    panelHeight,
    scale,
    canvasRef,
    layout,
    gridSnapEnabled,
    railMeasureMode,
  })

  const placedArea = layout.placedComponents.reduce((sum, c) => sum + c.width * c.height, 0)
  const freeArea = panelWidth * panelHeight - placedArea
  const partsList = computePartsList(layout.placedComponents)

  function handleNotesChange(key, text) {
    setPartNotes((prev) => ({ ...prev, [key]: text }))
  }

  function isDirty() {
    const current = JSON.stringify({
      placedComponents: layout.placedComponents,
      library: library ?? defaultComponents,
      partNotes,
    })
    return current !== lastSavedSnapshotRef.current
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        layout.undo()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (layout.selectedIds.size > 0) {
          e.preventDefault()
          layout.copySelected()
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        layout.pasteClipboard()
        return
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomPan.zoomIn()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        zoomPan.zoomOut()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        zoomPan.resetZoom()
        return
      }

      if (layout.selectedIds.size === 0) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        layout.deleteSelected()
      } else if (e.key.toLowerCase() === 'r') {
        layout.rotateSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [layout, zoomPan])

  function handleAdd(component) {
    setLibrary((prev) => [...prev, { id: crypto.randomUUID(), ...component }])
  }

  function handleUpdate(id, updates) {
    setLibrary((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  function handleDelete(id) {
    setLibrary((prev) => prev.filter((c) => c.id !== id))
  }

  function saveAs(name) {
    const id = currentProjectId ?? crypto.randomUUID()
    const now = new Date().toISOString()

    setProjects((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === id)
      const record = {
        id,
        name,
        panelWidth,
        panelHeight,
        placedComponents: layout.placedComponents,
        componentLibrary: library ?? defaultComponents,
        partNotes,
        createdAt: existingIndex >= 0 ? prev[existingIndex].createdAt : now,
        updatedAt: now,
      }
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = record
        return next
      }
      return [...prev, record]
    })

    lastSavedSnapshotRef.current = JSON.stringify({
      placedComponents: layout.placedComponents,
      library: library ?? defaultComponents,
      partNotes,
    })

    setCurrentProjectId(id)
    setCurrentProjectName(name)
    setSaveDialogOpen(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)

    if (navigateAfterSaveRef.current) {
      navigateAfterSaveRef.current = false
      navigate('/')
    }
  }

  function handleSaveClick() {
    if (currentProjectId) {
      saveAs(currentProjectName)
    } else {
      setSaveDialogOpen(true)
    }
  }

  function handleNewPanelClick() {
    if (isDirty()) {
      setUnsavedPromptOpen(true)
    } else {
      navigate('/')
    }
  }

  function handleUnsavedSave() {
    setUnsavedPromptOpen(false)
    if (currentProjectId) {
      saveAs(currentProjectName)
      navigate('/')
    } else {
      navigateAfterSaveRef.current = true
      setSaveDialogOpen(true)
    }
  }

  function handleUnsavedDiscard() {
    setUnsavedPromptOpen(false)
    navigate('/')
  }

  function handleExportClick() {
    exportProjectToFile({
      name: currentProjectName || 'Untitled panel',
      panelWidth,
      panelHeight,
      placedComponents: layout.placedComponents,
      componentLibrary: library ?? defaultComponents,
      partNotes,
    })
  }

  // Reordering the sidebar's component list is a separate drag type from
  // canvas placement/movement — useCanvasDnd ignores it entirely (its own
  // origin ref stays null), so it's handled here instead.
  function handleDragEnd(event) {
    if (event.active.data.current?.type === 'sort') {
      const oldIndex = library.findIndex((c) => c.id === event.active.id)
      const newIndex = library.findIndex((c) => c.id === event.over?.id)
      if (event.over && oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setLibrary((prev) => arrayMove(prev, oldIndex, newIndex))
      }
      return
    }
    dnd.handleDragEnd(event)
  }

  if (!state?.panelWidth || !state?.panelHeight) {
    navigate('/', { replace: true })
    return null
  }

  return (
    <DndContext
      sensors={dnd.sensors}
      onDragStart={dnd.handleDragStart}
      onDragMove={dnd.handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={dnd.handleDragCancel}
    >
      <div className="flex h-full bg-neutral-900 text-neutral-100">
        <ComponentLibrarySidebar
          library={library}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-neutral-700 px-6 py-3">
            <div>
              <h1 className="text-base font-semibold">
                Panel Builder{currentProjectName && <span className="text-neutral-400"> &middot; {currentProjectName}</span>}
              </h1>
              <p className="text-sm text-neutral-400">
                {panelWidth}&Prime; &times; {panelHeight}&Prime; internal
              </p>
            </div>
            <div className="text-right text-sm text-neutral-400">
              Free area
              <div className="text-base font-semibold text-neutral-100">
                {freeArea.toFixed(1)} in&sup2;
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={gridSnapEnabled}
                onChange={(e) => setGridSnapEnabled(e.target.checked)}
              />
              Snap to 1/8&Prime;
            </label>
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={useFraction}
                onChange={(e) => setUseFraction(e.target.checked)}
              />
              Show as fraction
            </label>
            <label className="flex items-center gap-1.5 text-sm text-neutral-300">
              Rail ref
              <select
                value={railMeasureMode}
                onChange={(e) => setRailMeasureMode(e.target.value)}
                title="Which point on a rail its distance-from-top is measured/snapped from"
                className="rounded border border-neutral-600 bg-neutral-900 px-1 py-1 text-xs text-neutral-100"
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
            <button
              type="button"
              onClick={layout.undo}
              disabled={!layout.canUndo}
              title="Undo (Ctrl+Z)"
              className="rounded border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={layout.repeatLastPlacement}
              disabled={!layout.lastPlacement}
              title={
                layout.lastPlacement
                  ? `Add ${layout.lastPlacement.quantity} more ${layout.lastPlacement.component.name}, continuing the row`
                  : 'Place something first'
              }
              className={
                layout.lastPlacement
                  ? 'rounded border border-blue-500 bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-500'
                  : 'rounded border border-neutral-600 px-3 py-1.5 text-sm opacity-40'
              }
            >
              Repeat{layout.lastPlacement ? ` ×${layout.lastPlacement.quantity}` : ''}
            </button>
            <div className="flex items-center gap-1 rounded border border-neutral-600">
              <button
                type="button"
                onClick={zoomPan.zoomOut}
                title="Zoom out (Ctrl+Scroll or Ctrl+-)"
                className="px-2 py-1.5 text-sm hover:bg-neutral-800"
              >
                &minus;
              </button>
              <button
                type="button"
                onClick={zoomPan.resetZoom}
                title="Reset to fit (Ctrl+0)"
                className="min-w-14 px-1 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                {Math.round(zoomPan.zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomPan.zoomIn}
                title="Zoom in (Ctrl+Scroll or Ctrl++)"
                className="px-2 py-1.5 text-sm hover:bg-neutral-800"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleSaveClick}
              className="rounded border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              {justSaved ? 'Saved ✓' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleExportClick}
              className="rounded border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800"
              title="Download this panel as a file you can save on your computer"
            >
              Export
            </button>
            <button
              type="button"
              onClick={handleNewPanelClick}
              className="rounded border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              New panel
            </button>
          </header>

          <div className="relative flex-1 overflow-hidden">
            <div ref={containerRef} onScroll={zoomPan.handleScroll} className="h-full w-full overflow-auto">
              <div className="flex min-h-full min-w-full items-center justify-center p-8">
                {scale > 0 && (
                  <RailExternalRuler
                    rails={layout.placedComponents.filter((c) => c.isRail)}
                    panelHeight={panelHeight}
                    scale={scale}
                    useFraction={useFraction}
                    railMeasureMode={railMeasureMode}
                  />
                )}
                <PanelCanvas
                  canvasRef={canvasRef}
                  panelWidth={panelWidth}
                  panelHeight={panelHeight}
                  scale={scale}
                  placedComponents={layout.placedComponents}
                  selectedIds={layout.selectedIds}
                  overlappingIds={layout.overlappingIds}
                  dragGhost={dnd.dragGhost}
                  onSelect={layout.select}
                  onClearSelection={layout.clearSelection}
                  onToggleLock={layout.toggleLock}
                  onMoveComponentBy={layout.moveComponentBy}
                  useFraction={useFraction}
                  railMeasureMode={railMeasureMode}
                  lastPlacement={layout.lastPlacement}
                  onRepeatPlacement={layout.repeatLastPlacement}
                />
              </div>
            </div>

            {isZoomedBeyondFit && (
              <Minimap
                placedComponents={layout.placedComponents}
                panelWidth={panelWidth}
                panelHeight={panelHeight}
                scale={scale}
                scrollPos={zoomPan.scrollPos}
                viewportWidth={containerSize.width}
                viewportHeight={containerSize.height}
              />
            )}
          </div>

          <SelectionInfoBar
            placedComponents={layout.placedComponents}
            selectedIds={layout.selectedIds}
            onDelete={layout.deleteSelected}
            onRotate={layout.rotateSelected}
            onGroup={layout.groupSelected}
            onUngroup={layout.ungroupSelected}
            onCopy={layout.copySelected}
            onPaste={layout.pasteClipboard}
            hasClipboard={layout.hasClipboard}
          />

          <PartsListPanel
            partsList={partsList}
            notes={partNotes}
            onNotesChange={handleNotesChange}
            selectedIds={layout.selectedIds}
            onSelectPart={layout.selectByIds}
          />
        </div>
      </div>

      <DragOverlay>
        {dnd.activeLibraryComponent && (
          <div className="flex items-center gap-2 rounded border border-neutral-500 bg-neutral-800 px-2 py-1 text-xs shadow-lg">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: dnd.activeLibraryComponent.color }}
            />
            {dnd.activeLibraryComponent.name}
          </div>
        )}
      </DragOverlay>

      {saveDialogOpen && (
        <SaveProjectDialog
          initialName={currentProjectName}
          onSave={saveAs}
          onCancel={() => {
            navigateAfterSaveRef.current = false
            setSaveDialogOpen(false)
          }}
        />
      )}

      {unsavedPromptOpen && (
        <UnsavedChangesDialog
          onSave={handleUnsavedSave}
          onDiscard={handleUnsavedDiscard}
          onCancel={() => setUnsavedPromptOpen(false)}
        />
      )}
    </DndContext>
  )
}
