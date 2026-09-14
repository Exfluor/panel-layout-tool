import { isDarkColor } from '../lib/color'
import { formatInches } from '../lib/formatInches'
import { getBounds, getEffectiveSize } from '../lib/geometry'
import PartDimensionGuides from './PartDimensionGuides'

const PX_PER_IN = 96 // CSS spec: 1in is always exactly 96px, on screen or on paper

// A label crammed into a box too small to hold it just reads as garbled
// overlapping text on paper — better to leave those unlabeled (matching how
// the live canvas hides a truncated name too, showing it only on hover).
const MIN_LABEL_WIDTH_IN = 0.35
const MIN_LABEL_HEIGHT_IN = 0.14

// Fits the panel into a fixed print-safe box, in CSS inches so it renders
// at a predictable, consistent size both on screen and on paper (a US
// Letter page minus margins is ~7.5in wide).
const DIAGRAM_MAX_WIDTH_IN = 6.5
const DIAGRAM_MAX_HEIGHT_IN = 4.5

function PanelDiagram({ panelWidth, panelHeight, placedComponents }) {
  if (!(panelWidth > 0) || !(panelHeight > 0)) return null
  const scale = Math.min(DIAGRAM_MAX_WIDTH_IN / panelWidth, DIAGRAM_MAX_HEIGHT_IN / panelHeight)

  return (
    <div
      className="relative border-2 border-black"
      style={{ width: `${panelWidth * scale}in`, height: `${panelHeight * scale}in` }}
    >
      {[...placedComponents]
        .sort((a, b) => (a.isRail === b.isRail ? 0 : a.isRail ? -1 : 1))
        .map((c) => {
          const { width, height } = getEffectiveSize(c)
          const dark = isDarkColor(c.color)
          const showLabel = width * scale >= MIN_LABEL_WIDTH_IN && height * scale >= MIN_LABEL_HEIGHT_IN
          return (
            <div
              key={c.id}
              className={`absolute flex items-center justify-center overflow-hidden border border-black/40 text-[7px] leading-tight font-medium ${dark ? 'text-white' : 'text-black'}`}
              style={{
                left: `${c.x * scale}in`,
                top: `${c.y * scale}in`,
                width: `${width * scale}in`,
                height: `${height * scale}in`,
                backgroundColor: c.color,
              }}
            >
              {showLabel && <span className="truncate px-0.5">{c.name}</span>}
            </div>
          )
        })}
    </div>
  )
}

function railMeasureY(y, height, railMeasureMode) {
  if (railMeasureMode === 'top') return y
  if (railMeasureMode === 'bottom') return y + height
  return y + height / 2
}

const noop = () => {}

// For a rail's tallest mounted part, the vertical clearance to whatever's
// immediately above/below it outside the rail assembly — in practice the
// Panduit wireway sandwiching that row, which is the clearance a technician
// actually needs when routing wire. Only counts a candidate that at least
// partly overlaps the tallest part horizontally, so an unrelated part
// elsewhere on the panel with a coincidentally similar Y isn't picked.
function getTallestPartGaps(rail, placedComponents) {
  const mounted = placedComponents.filter((c) => c.mountedOnRailId === rail.id)
  if (mounted.length === 0) return null

  const tallest = mounted.reduce((best, c) =>
    getEffectiveSize(c).height > getEffectiveSize(best).height ? c : best,
  )
  const bounds = getBounds(tallest)

  const others = placedComponents.filter((c) => c.id !== rail.id && c.mountedOnRailId !== rail.id)
  let above = null
  let below = null
  for (const other of others) {
    const ob = getBounds(other)
    const overlapsX = ob.x < bounds.x + bounds.width && ob.x + ob.width > bounds.x
    if (!overlapsX) continue

    if (ob.y + ob.height <= bounds.y + 1e-6) {
      const gap = bounds.y - (ob.y + ob.height)
      if (!above || gap < above.gap) above = { gap, edgeY: ob.y + ob.height }
    }
    if (ob.y >= bounds.y + bounds.height - 1e-6) {
      const gap = ob.y - (bounds.y + bounds.height)
      if (!below || gap < below.gap) below = { gap, edgeY: bounds.y + bounds.height }
    }
  }
  if (!above && !below) return null
  return { bounds, above, below }
}

const PAGE_MAX_WIDTH_IN = 7
const PAGE_MAX_HEIGHT_IN = 8.5
const RULER_WIDTH_IN = 0.9

// Each rail's distance from the panel top (whichever edge/center is chosen)
// shown in a margin to the left of the diagram instead of as a line drawn
// through it — with several rails, running every one of those lines through
// the panel itself gets crowded and overlaps fast.
function ExternalRuler({ rails, panelHeight, fitScale, useFraction, railMeasureMode }) {
  return (
    <div className="relative shrink-0" style={{ width: `${RULER_WIDTH_IN}in`, height: `${panelHeight * fitScale}in` }}>
      {rails.map((rail) => {
        const { height } = getEffectiveSize(rail)
        const measureY = railMeasureY(rail.y, height, railMeasureMode)
        return (
          <div
            key={rail.id}
            className="absolute right-0 flex -translate-y-1/2 items-center gap-1"
            style={{ top: `${measureY * fitScale}in` }}
          >
            <span className="text-[9px] whitespace-nowrap text-black">{formatInches(measureY, useFraction)}</span>
            <span className="h-px w-2 bg-black" />
          </div>
        )
      })}
    </div>
  )
}

// A bigger, dimension-focused redraw of the panel: every rail's position
// (from the panel edges) and length is always shown — no selection needed —
// plus the clearance from each rail's tallest mounted part to the nearest
// part above/below it.
function RailMeasurementsPage({ panelWidth, panelHeight, placedComponents, useFraction, railMeasureMode }) {
  const rails = placedComponents.filter((c) => c.isRail)
  if (rails.length === 0 || !(panelWidth > 0) || !(panelHeight > 0)) return null

  const fitScale = Math.min(PAGE_MAX_WIDTH_IN / panelWidth, PAGE_MAX_HEIGHT_IN / panelHeight)
  const pxScale = fitScale * PX_PER_IN

  return (
    <div className="break-before-page">
      <h2 className="mb-2 text-base font-bold tracking-wide uppercase">DIN Rail Measurements</h2>
      <div className="flex items-start gap-1">
        <ExternalRuler
          rails={rails}
          panelHeight={panelHeight}
          fitScale={fitScale}
          useFraction={useFraction}
          railMeasureMode={railMeasureMode}
        />
        <div
          className="relative border-2 border-black"
          style={{ width: `${panelWidth * fitScale}in`, height: `${panelHeight * fitScale}in` }}
        >
          {[...placedComponents]
            .sort((a, b) => (a.isRail === b.isRail ? 0 : a.isRail ? -1 : 1))
            .map((c) => {
              const { width, height } = getEffectiveSize(c)
              return (
                <div
                  key={c.id}
                  className="absolute border border-black/30"
                  style={{
                    left: `${c.x * fitScale}in`,
                    top: `${c.y * fitScale}in`,
                    width: `${width * fitScale}in`,
                    height: `${height * fitScale}in`,
                    backgroundColor: c.color,
                    opacity: c.isRail ? 1 : 0.45,
                  }}
                />
              )
            })}

          {rails.map((rail) => {
            const { width, height } = getEffectiveSize(rail)
            const part = {
              id: rail.id,
              x: rail.x,
              y: rail.y,
              width,
              height,
              isRail: true,
              measureY: railMeasureY(rail.y, height, railMeasureMode),
            }
            return (
              <PartDimensionGuides
                key={rail.id}
                part={part}
                panelWidth={panelWidth}
                scale={pxScale}
                useFraction={useFraction}
                editable={false}
                showVertical={false}
                onEditMeasure={noop}
                onEditLeftGap={noop}
                onEditRightGap={noop}
              />
            )
          })}

          {rails.map((rail) => {
            const gaps = getTallestPartGaps(rail, placedComponents)
            if (!gaps) return null
            const centerX = (gaps.bounds.x + gaps.bounds.width / 2) * fitScale
            return (
              <div key={`gap-${rail.id}`}>
                {gaps.above && gaps.above.gap > 0.01 && (
                  <>
                    <div
                      className="absolute border-l border-dashed border-red-600"
                      style={{
                        left: `${centerX}in`,
                        top: `${gaps.above.edgeY * fitScale}in`,
                        height: `${gaps.above.gap * fitScale}in`,
                      }}
                    />
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white px-1 text-[9px] whitespace-nowrap text-red-700"
                      style={{ left: `${centerX}in`, top: `${(gaps.above.edgeY + gaps.above.gap / 2) * fitScale}in` }}
                    >
                      {formatInches(gaps.above.gap, useFraction)}
                    </span>
                  </>
                )}
                {gaps.below && gaps.below.gap > 0.01 && (
                  <>
                    <div
                      className="absolute border-l border-dashed border-red-600"
                      style={{
                        left: `${centerX}in`,
                        top: `${(gaps.bounds.y + gaps.bounds.height) * fitScale}in`,
                        height: `${gaps.below.gap * fitScale}in`,
                      }}
                    />
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white px-1 text-[9px] whitespace-nowrap text-red-700"
                      style={{
                        left: `${centerX}in`,
                        top: `${(gaps.bounds.y + gaps.bounds.height + gaps.below.gap / 2) * fitScale}in`,
                      }}
                    >
                      {formatInches(gaps.below.gap, useFraction)}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-600">
        Left margin: each rail's distance from the panel top. Green dashed lines: each rail's distance from the
        panel's left/right edges. Red dashed lines: clearance from the tallest component mounted on that rail to
        whatever is directly above/below it.
      </p>
    </div>
  )
}

// A printable technician build sheet: project title, a labeled diagram of
// the panel, DIN rail measurements, and a Bill of Materials. A later
// iteration adds a labeled/arrowed component layout with identical-adjacent
// parts bracketed together as one callout. Deliberately styled
// light-on-white regardless of the app's dark theme, since it's meant to be
// read on paper.
export default function BuildSheetView({
  projectName,
  panelWidth,
  panelHeight,
  placedComponents,
  partsList,
  partNotes,
  useFraction,
  railMeasureMode,
  onClose,
}) {
  const totalCount = partsList.reduce((sum, p) => sum + p.quantity, 0)
  const today = new Date().toLocaleDateString()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/80">
      <div className="mx-auto my-6 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <p className="text-sm text-neutral-300">Build sheet preview — use your browser's print dialog to save as PDF.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-600 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            Close
          </button>
        </div>
      </div>

      <div
        id="build-sheet-print"
        className="mx-auto mb-10 max-w-3xl bg-white p-10 text-black shadow-xl print:m-0 print:max-w-none print:p-0 print:shadow-none"
      >
        <div className="mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold">{projectName || 'Untitled panel'}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {panelWidth}&Prime; &times; {panelHeight}&Prime; internal &middot; Generated {today}
          </p>
        </div>

        <h2 className="mb-2 text-base font-bold tracking-wide uppercase">Panel layout</h2>
        <div className="mb-6 flex justify-center">
          <PanelDiagram panelWidth={panelWidth} panelHeight={panelHeight} placedComponents={placedComponents} />
        </div>

        <h2 className="mb-2 text-base font-bold tracking-wide uppercase">Bill of Materials</h2>
        {partsList.length === 0 ? (
          <p className="text-sm text-neutral-600">No components placed on this panel.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-1.5 pr-3 font-semibold">Name</th>
                <th className="py-1.5 pr-3 font-semibold">Part #</th>
                <th className="py-1.5 pr-3 font-semibold">Dimensions</th>
                <th className="py-1.5 pr-3 font-semibold">Qty</th>
                <th className="py-1.5 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {partsList.map((part) => (
                <tr key={part.key} className="border-b border-neutral-300">
                  <td className="py-1.5 pr-3">{part.name}</td>
                  <td className="py-1.5 pr-3 text-neutral-700">{part.partNumber || '—'}</td>
                  <td className="py-1.5 pr-3 text-neutral-700">
                    {formatInches(part.width, useFraction)} &times; {formatInches(part.height, useFraction)}
                  </td>
                  <td className="py-1.5 pr-3 text-neutral-700">{part.quantity}</td>
                  <td className="py-1.5 text-neutral-700">{partNotes?.[part.key] || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black text-sm font-semibold">
                <td className="py-1.5" colSpan={3}>
                  Total
                </td>
                <td className="py-1.5">{totalCount}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}

        <RailMeasurementsPage
          panelWidth={panelWidth}
          panelHeight={panelHeight}
          placedComponents={placedComponents}
          useFraction={useFraction}
          railMeasureMode={railMeasureMode}
        />
      </div>
    </div>
  )
}
