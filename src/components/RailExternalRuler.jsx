import { getEffectiveSize } from '../lib/geometry'
import { formatInches } from '../lib/formatInches'

export const RULER_WIDTH = 64

// Always-visible (not tied to selection) list of every rail's centerline
// distance from the panel top, shown in the margin outside the panel so it
// doesn't compete with anything drawn on the canvas itself. One row per rail.
export default function RailExternalRuler({ rails, panelHeight, scale, useFraction }) {
  return (
    <div className="relative shrink-0" style={{ width: RULER_WIDTH, height: panelHeight * scale }}>
      {rails.map((rail) => {
        const { height } = getEffectiveSize(rail)
        const centerY = rail.y + height / 2
        return (
          <div
            key={rail.id}
            className="absolute right-0 flex -translate-y-1/2 items-center gap-1"
            style={{ top: centerY * scale }}
          >
            <span className="whitespace-nowrap text-[10px] text-neutral-400">
              {formatInches(centerY, useFraction)}
            </span>
            <span className="h-px w-3 bg-neutral-500" />
          </div>
        )
      })}
    </div>
  )
}
