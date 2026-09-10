import { getEffectiveSize } from '../lib/geometry'
import { formatInches } from '../lib/formatInches'

export const RULER_WIDTH = 64

function railMeasureY(y, height, railMeasureMode) {
  if (railMeasureMode === 'top') return y
  if (railMeasureMode === 'bottom') return y + height
  return y + height / 2 // 'center'
}

// Always-visible (not tied to selection) list of every rail's distance from
// the panel top — measured from whichever edge/center is chosen — shown in
// the margin outside the panel so it doesn't compete with anything drawn on
// the canvas itself. One row per rail.
export default function RailExternalRuler({ rails, panelHeight, scale, useFraction, railMeasureMode }) {
  return (
    <div className="relative shrink-0" style={{ width: RULER_WIDTH, height: panelHeight * scale }}>
      {rails.map((rail) => {
        const { height } = getEffectiveSize(rail)
        const measureY = railMeasureY(rail.y, height, railMeasureMode)
        return (
          <div
            key={rail.id}
            className="absolute right-0 flex -translate-y-1/2 items-center gap-1"
            style={{ top: measureY * scale }}
          >
            <span className="whitespace-nowrap text-[10px] text-neutral-400">
              {formatInches(measureY, useFraction)}
            </span>
            <span className="h-px w-3 bg-neutral-500" />
          </div>
        )
      })}
    </div>
  )
}
