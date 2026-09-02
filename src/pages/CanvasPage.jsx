import { useLocation, useNavigate } from 'react-router-dom'
import { useElementSize } from '../hooks/useElementSize'

const PADDING = 32

export default function CanvasPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [containerRef, containerSize] = useElementSize()

  if (!state?.panelWidth || !state?.panelHeight) {
    navigate('/', { replace: true })
    return null
  }

  const { panelWidth, panelHeight } = state
  const freeArea = panelWidth * panelHeight

  const availableWidth = containerSize.width - PADDING * 2
  const availableHeight = containerSize.height - PADDING * 2
  const scale =
    availableWidth > 0 && availableHeight > 0
      ? Math.min(availableWidth / panelWidth, availableHeight / panelHeight)
      : 0

  const canvasWidth = panelWidth * scale
  const canvasHeight = panelHeight * scale

  return (
    <div className="flex h-full flex-col bg-neutral-900 text-neutral-100">
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
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800"
        >
          New panel
        </button>
      </header>

      <div ref={containerRef} className="flex flex-1 items-center justify-center overflow-hidden">
        {scale > 0 && (
          <div
            className="relative border border-neutral-500"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
              backgroundSize: `${scale}px ${scale}px`,
            }}
          />
        )}
      </div>
    </div>
  )
}
