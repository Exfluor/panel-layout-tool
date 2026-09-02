import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ComponentLibrarySidebar from '../components/ComponentLibrarySidebar'
import PanelCanvas from '../components/PanelCanvas'
import SelectionInfoBar from '../components/SelectionInfoBar'
import { useCanvasDnd } from '../hooks/useCanvasDnd'
import { useElementSize } from '../hooks/useElementSize'
import { useLocalStorageState } from '../hooks/useLocalStorageState'
import { usePanelLayout } from '../hooks/usePanelLayout'
import { defaultComponents } from '../lib/defaultComponents'

const PADDING = 32

export default function CanvasPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [containerRef, containerSize] = useElementSize()
  const canvasRef = useRef(null)
  const [library, setLibrary] = useLocalStorageState(
    'panelBuilder.componentLibrary',
    defaultComponents,
  )
  const layout = usePanelLayout()
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true)
  const [useFraction, setUseFraction] = useState(true)

  const panelWidth = state?.panelWidth ?? 0
  const panelHeight = state?.panelHeight ?? 0

  const availableWidth = containerSize.width - PADDING * 2
  const availableHeight = containerSize.height - PADDING * 2
  const scale =
    panelWidth > 0 && panelHeight > 0 && availableWidth > 0 && availableHeight > 0
      ? Math.min(availableWidth / panelWidth, availableHeight / panelHeight)
      : 0

  const dnd = useCanvasDnd({ panelWidth, panelHeight, scale, canvasRef, layout, gridSnapEnabled })

  const placedArea = layout.placedComponents.reduce((sum, c) => sum + c.width * c.height, 0)
  const freeArea = panelWidth * panelHeight - placedArea

  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
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
  }, [layout])

  function handleAdd(component) {
    setLibrary((prev) => [...prev, { id: crypto.randomUUID(), ...component }])
  }

  function handleUpdate(id, updates) {
    setLibrary((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  function handleDelete(id) {
    setLibrary((prev) => prev.filter((c) => c.id !== id))
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
      onDragEnd={dnd.handleDragEnd}
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
              <h1 className="text-base font-semibold">Panel Builder</h1>
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
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              New panel
            </button>
          </header>

          <div ref={containerRef} className="flex flex-1 items-center justify-center overflow-hidden">
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
              useFraction={useFraction}
            />
          </div>

          <SelectionInfoBar
            placedComponents={layout.placedComponents}
            selectedIds={layout.selectedIds}
            onDelete={layout.deleteSelected}
            onRotate={layout.rotateSelected}
            onGroup={layout.groupSelected}
            onUngroup={layout.ungroupSelected}
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
    </DndContext>
  )
}
