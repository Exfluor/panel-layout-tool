import { createPortal } from 'react-dom'
import { isDarkColor } from '../lib/color'
import { formatInches } from '../lib/formatInches'
import { getBounds, getEffectiveSize } from '../lib/geometry'
import ComponentIdentificationPage from './ComponentIdentificationPage'
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

// The vertical clearance from `bounds` to whatever's directly above/below
// it, ignoring anything in `excludeIds` (so an object doesn't count its own
// members as its neighbor). Only counts a candidate that at least partly
// overlaps horizontally, so an unrelated part elsewhere on the panel with a
// coincidentally similar Y isn't picked.
function getClearanceGaps(bounds, excludeIds, placedComponents) {
  let above = null
  let below = null
  for (const other of placedComponents) {
    if (excludeIds.has(other.id)) continue
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

// For a rail's tallest mounted part, the vertical clearance to whatever's
// immediately above/below it outside the rail assembly — in practice the
// Panduit wireway sandwiching that row, which is the clearance a technician
// actually needs when routing wire.
function getTallestPartGaps(rail, placedComponents) {
  const mounted = placedComponents.filter((c) => c.mountedOnRailId === rail.id)
  if (mounted.length === 0) return null

  const tallest = mounted.reduce((best, c) =>
    getEffectiveSize(c).height > getEffectiveSize(best).height ? c : best,
  )
  const bounds = getBounds(tallest)
  const excludeIds = new Set([rail.id, ...mounted.map((c) => c.id)])
  return getClearanceGaps(bounds, excludeIds, placedComponents)
}

const PAGE_MAX_HEIGHT_IN = 8.5
const RULER_WIDTH_IN = 0.9
const RULER_GAP_IN = 0.15
// Budgeted separately from the ruler's own width so the two together never
// exceed the page's content width — otherwise the diagram alone would be
// sized to fit the *whole* page and the ruler would push the total wider,
// spilling past the right edge.
const PAGE_DIAGRAM_MAX_WIDTH_IN = 7 - RULER_WIDTH_IN - RULER_GAP_IN

// Each measured item's distance from the panel top — a rail's whichever
// edge/center is chosen, or a free-floating (not on any rail) part/group's
// plain top edge, matching how the live canvas already measures a non-rail
// part — shown in a margin to the left of the diagram instead of as a line
// drawn through it — with several of these, running every one of those
// lines through the panel itself gets crowded and overlaps fast. Positioned
// at the item's geometric center (not measureY) so the tick lines up with
// the green left/right position lines inside the diagram, which are drawn
// through that same center regardless of the top/center/bottom measuring
// mode — only the printed number reflects the chosen mode.
function ExternalRuler({ items, panelHeight, fitScale, useFraction, railMeasureMode }) {
  return (
    <div className="relative shrink-0" style={{ width: `${RULER_WIDTH_IN}in`, height: `${panelHeight * fitScale}in` }}>
      {items.map((item) => {
        const { height } = getEffectiveSize(item)
        const centerY = item.y + height / 2
        const measureY = item.isRail ? railMeasureY(item.y, height, railMeasureMode) : item.y
        const top = `${centerY * fitScale}in`
        return (
          <div key={item.id}>
            {/* Positioned independently of the label so its own vertical
                centering can't drift off the diagram's line — a shared flex
                row centers on font line-height, not the true midpoint. */}
            <span className="absolute right-0 h-px w-2 -translate-y-1/2 bg-black" style={{ top }} />
            <span
              className="absolute -translate-y-1/2 text-[9px] whitespace-nowrap text-black"
              style={{ top, right: '0.3in' }}
            >
              {formatInches(measureY, useFraction)}
            </span>
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
  const freeComponents = placedComponents.filter((c) => !c.isRail && c.mountedOnRailId == null)

  // A manually-grouped cluster among the free-floating parts is measured as
  // one object — its leftmost/topmost to rightmost/bottommost extent —
  // rather than a separate ruler entry and position lines per member.
  const groupIds = [...new Set(freeComponents.filter((c) => c.groupId).map((c) => c.groupId))]
  const groupItems = groupIds.map((groupId) => {
    const members = freeComponents.filter((c) => c.groupId === groupId)
    const boundsList = members.map(getBounds)
    const x1 = Math.min(...boundsList.map((b) => b.x))
    const y1 = Math.min(...boundsList.map((b) => b.y))
    const x2 = Math.max(...boundsList.map((b) => b.x + b.width))
    const y2 = Math.max(...boundsList.map((b) => b.y + b.height))
    return {
      id: `group-${groupId}`,
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      rotation: 0,
      isRail: false,
      memberIds: members.map((c) => c.id),
    }
  })
  const standaloneItems = freeComponents.filter((c) => !c.groupId)
  const measuredItems = [...rails, ...standaloneItems, ...groupItems]
  if (measuredItems.length === 0 || !(panelWidth > 0) || !(panelHeight > 0)) return null

  // Extendable parts (anything marked "Resizable" in the library, e.g.
  // Panduit) don't get their own clearance measurement or left/right
  // position lines below — a cut-to-fit part's distance to its neighbor (or
  // to the panel edges) isn't a fixed measurement the way it is for a
  // fixed-size part. A rail always gets both regardless (handled
  // separately below); a group has no resizable flag of its own, so it's
  // never excluded.
  const nonExtendableStandalone = standaloneItems.filter((c) => !c.resizable)
  const clearanceTargets = [...nonExtendableStandalone, ...groupItems]
  const dimensionGuideTargets = [...rails, ...nonExtendableStandalone, ...groupItems]

  const gapEntries = [
    ...rails.map((rail) => ({ key: `gap-${rail.id}`, gaps: getTallestPartGaps(rail, placedComponents) })),
    ...clearanceTargets.map((item) => ({
      key: `gap-${item.id}`,
      gaps: getClearanceGaps(getBounds(item), new Set(item.memberIds ?? [item.id]), placedComponents),
    })),
  ].filter((entry) => entry.gaps)

  // One final measurement from the lowest qualifying item's bottom edge
  // down to the panel's own bottom edge, so the whole stack is bracketed
  // from the panel's top all the way down, not just top-to-each-item.
  const bottomCandidates = [...rails, ...clearanceTargets]
  let bottomMeasurement = null
  if (bottomCandidates.length > 0) {
    const lowest = bottomCandidates.reduce((best, c) => {
      const b = getBounds(c)
      const bestB = getBounds(best)
      return b.y + b.height > bestB.y + bestB.height ? c : best
    })
    const lb = getBounds(lowest)
    const bottomGap = panelHeight - (lb.y + lb.height)
    if (bottomGap > 0.01) {
      bottomMeasurement = { x: lb.x + lb.width / 2, y: lb.y + lb.height, gap: bottomGap }
    }
  }

  const fitScale = Math.min(PAGE_DIAGRAM_MAX_WIDTH_IN / panelWidth, PAGE_MAX_HEIGHT_IN / panelHeight)
  const pxScale = fitScale * PX_PER_IN

  return (
    <div className="break-before-page">
      <h2 className="mb-2 text-base font-bold tracking-wide uppercase">DIN Rail Measurements</h2>
      <div className="flex items-start gap-1">
        <ExternalRuler
          items={measuredItems}
          panelHeight={panelHeight}
          fitScale={fitScale}
          useFraction={useFraction}
          railMeasureMode={railMeasureMode}
        />
        <div
          className="relative"
          style={{
            width: `${panelWidth * fitScale}in`,
            height: `${panelHeight * fitScale}in`,
            // A border would inset the panel's coordinate origin by its own
            // width, throwing every child's position off by that much
            // relative to the external ruler (which has no border) —
            // outline draws the same edge without affecting layout at all.
            outline: '2px solid black',
          }}
        >
          {[...placedComponents]
            .sort((a, b) => (a.isRail === b.isRail ? 0 : a.isRail ? -1 : 1))
            .map((c) => {
              const { width, height } = getEffectiveSize(c)
              const w = width * fitScale
              const h = height * fitScale
              const nameworthy = c.isRail || c.mountedOnRailId == null
              const fitsHorizontal = w >= MIN_LABEL_WIDTH_IN && h >= MIN_LABEL_HEIGHT_IN
              const fitsVertical = h >= MIN_LABEL_WIDTH_IN && w >= MIN_LABEL_HEIGHT_IN
              const showLabel = nameworthy && (fitsHorizontal || fitsVertical)
              const vertical = showLabel && !fitsHorizontal
              const dark = isDarkColor(c.color)
              return (
                <div
                  key={c.id}
                  // Top-aligned rather than centered: the measurement badges
                  // (left/right gap labels, the external ruler's tick) all
                  // sit on this same row's vertical centerline, so a
                  // centered name would collide with them whenever the box
                  // has enough height to show the difference.
                  className={`absolute flex items-start justify-center overflow-hidden border border-black/30 pt-px text-[7px] leading-tight font-medium ${dark ? 'text-white' : 'text-black'}`}
                  style={{
                    left: `${c.x * fitScale}in`,
                    top: `${c.y * fitScale}in`,
                    width: `${w}in`,
                    height: `${h}in`,
                    backgroundColor: c.color,
                    opacity: nameworthy ? 1 : 0.45,
                  }}
                >
                  {showLabel && (
                    <span className="truncate px-0.5" style={vertical ? { writingMode: 'vertical-rl' } : undefined}>
                      {c.name}
                    </span>
                  )}
                </div>
              )
            })}

          {dimensionGuideTargets.map((item) => {
            const { width, height } = getEffectiveSize(item)
            const part = {
              id: item.id,
              x: item.x,
              y: item.y,
              width,
              height,
              isRail: item.isRail,
              measureY: item.isRail ? railMeasureY(item.y, height, railMeasureMode) : item.y,
            }
            return (
              <PartDimensionGuides
                key={item.id}
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

          {gapEntries.map(({ key, gaps }) => {
            const centerX = (gaps.bounds.x + gaps.bounds.width / 2) * fitScale
            return (
              <div key={key}>
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

          {bottomMeasurement && (
            <>
              <div
                className="absolute border-l border-dashed border-red-600"
                style={{
                  left: `${bottomMeasurement.x * fitScale}in`,
                  top: `${bottomMeasurement.y * fitScale}in`,
                  height: `${bottomMeasurement.gap * fitScale}in`,
                }}
              />
              <span
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white px-1 text-[9px] whitespace-nowrap text-red-700"
                style={{
                  left: `${bottomMeasurement.x * fitScale}in`,
                  top: `${(bottomMeasurement.y + bottomMeasurement.gap / 2) * fitScale}in`,
                }}
              >
                {formatInches(bottomMeasurement.gap, useFraction)}
              </span>
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-600">
        Left margin: each item's distance from the panel top. Green dashed lines: each item's distance from the
        panel's left/right edges. Red dashed lines: clearance from a rail's tallest mounted part (or a free-standing
        part/group) to whatever is directly above/below it, and from the lowest such item down to the panel's own
        bottom edge. Extendable parts (Panduit, DIN rail) don't get that red clearance measurement themselves — a
        cut-to-fit part's distance to its neighbor isn't a fixed measurement — though a rail's tallest mounted part
        still does.
      </p>
    </div>
  )
}

// A printable technician build sheet: project title, a labeled diagram of
// the panel, a Bill of Materials, DIN rail measurements, and a component
// identification page (names shown in-place on components large enough to
// hold them; small ones called out from a margin, with a bracket over any
// run of 2+ identical adjacent parts labeling the whole run once).
// Deliberately styled light-on-white regardless of the app's dark theme,
// since it's meant to be read on paper.
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

  // Rendered via a portal straight onto <body>, outside the app's own
  // layout tree — printing otherwise only produced the first page, because
  // this overlay's on-screen position:fixed (needed so it scrolls in place)
  // caps its box to one page/viewport's worth of content in most browsers'
  // print engines, silently dropping anything beyond that.
  return createPortal(
    <div id="build-sheet-overlay" className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/80">
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

        <ComponentIdentificationPage placedComponents={placedComponents} />
      </div>
    </div>,
    document.body,
  )
}
