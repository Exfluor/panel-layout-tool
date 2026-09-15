import { isDarkColor } from '../lib/color'
import { getBounds } from '../lib/geometry'

// Same true-to-scale diagram style as the rail measurements page, but with
// margins on both sides (rather than just the left) since labels can end up
// on either edge depending on where the too-small item sits. Everything —
// diagram, both margins, and the leader lines connecting them — shares one
// flat inch-based coordinate system so a leader line can actually span from
// a margin label to its component without the two living in separate,
// disconnected layout boxes.
const PAGE_MAX_HEIGHT_IN = 8
const MARGIN_WIDTH_IN = 1.1
const MARGIN_GAP_IN = 0.15
const PAGE_DIAGRAM_MAX_WIDTH_IN = 7 - 2 * (MARGIN_WIDTH_IN + MARGIN_GAP_IN)
const MIN_LABEL_LENGTH_IN = 0.35 // along the text's reading direction
const MIN_LABEL_THICKNESS_IN = 0.13 // perpendicular to it
const BRACKET_TICK_IN = 0.05
const CHAR_WIDTH_IN = 0.048
const MIN_MARGIN_LABEL_GAP_IN = 0.16

function typeKey(c) {
  return `${c.name}|${c.partNumber ?? ''}|${Math.round(c.width * 1000) / 1000}|${Math.round(c.height * 1000) / 1000}`
}

// Clusters components into rows by overlapping Y ranges, then within each
// row merges consecutive touching components of the identical type into one
// group — the same grouping the BOM uses for identical adjacent parts.
function buildGroups(placedComponents) {
  const withBounds = placedComponents.map((c) => ({ c, b: getBounds(c) }))
  const rows = []
  for (const item of withBounds) {
    const row = rows.find((r) => r.some(({ b }) => item.b.y < b.y + b.height && item.b.y + item.b.height > b.y))
    if (row) row.push(item)
    else rows.push([item])
  }

  const groups = []
  for (const row of rows) {
    const sorted = [...row].sort((a, b) => a.b.x - b.b.x)
    let i = 0
    while (i < sorted.length) {
      const key = typeKey(sorted[i].c)
      let j = i + 1
      while (
        j < sorted.length &&
        typeKey(sorted[j].c) === key &&
        Math.abs(sorted[j].b.x - (sorted[j - 1].b.x + sorted[j - 1].b.width)) < 0.05
      ) {
        j++
      }
      const members = sorted.slice(i, j)
      const bounds = members.map((m) => m.b)
      groups.push({
        ids: members.map((m) => m.c.id),
        name: members[0].c.name,
        color: members[0].c.color,
        count: members.length,
        x1: Math.min(...bounds.map((b) => b.x)),
        x2: Math.max(...bounds.map((b) => b.x + b.width)),
        y1: Math.min(...bounds.map((b) => b.y)),
        y2: Math.max(...bounds.map((b) => b.y + b.height)),
      })
      i = j
    }
  }
  return groups
}

function estimateLabelWidth(text) {
  return Math.max(0.3, text.length * CHAR_WIDTH_IN)
}

// Stacks one margin's labels top-to-bottom with guaranteed no overlap:
// sorted by anchor Y, each label sits at its own anchor by default but gets
// pushed down if that would collide with the previous (already-placed)
// label — since both stay in the same top-to-bottom order, their leader
// lines never cross.
function packMarginLabels(items) {
  const sorted = [...items].sort((a, b) => a.anchorY - b.anchorY)
  let prevBottom = -Infinity
  return sorted.map((item) => {
    const y = Math.max(item.anchorY, prevBottom + MIN_MARGIN_LABEL_GAP_IN)
    prevBottom = y
    return { ...item, labelY: y }
  })
}

export default function ComponentIdentificationPage({ panelWidth, panelHeight, placedComponents }) {
  if (!(panelWidth > 0) || !(panelHeight > 0) || placedComponents.length === 0) return null

  const scale = Math.min(PAGE_DIAGRAM_MAX_WIDTH_IN / panelWidth, PAGE_MAX_HEIGHT_IN / panelHeight)
  const groups = buildGroups(placedComponents)
  const diagramWidth = panelWidth * scale
  const diagramHeight = panelHeight * scale
  const diagramX = MARGIN_WIDTH_IN + MARGIN_GAP_IN // where the diagram starts in the shared coordinate space

  const inBoxLabels = []
  const brackets = []
  const leftItems = []
  const rightItems = []

  for (const g of groups) {
    const w = (g.x2 - g.x1) * scale
    const h = (g.y2 - g.y1) * scale
    const fitsHorizontal = w >= MIN_LABEL_LENGTH_IN && h >= MIN_LABEL_THICKNESS_IN
    const fitsVertical = h >= MIN_LABEL_LENGTH_IN && w >= MIN_LABEL_THICKNESS_IN
    const label = g.count > 1 ? `${g.name} (×${g.count})` : g.name

    if (fitsHorizontal || fitsVertical) {
      const vertical = !fitsHorizontal || (fitsVertical && h > w)
      inBoxLabels.push({
        key: g.ids.join('-'),
        left: diagramX + g.x1 * scale,
        top: g.y1 * scale,
        width: w,
        height: h,
        text: label,
        vertical,
        dark: isDarkColor(g.color),
      })
      continue
    }

    // Too small to hold its own label — point to it (or, for 2+ identical
    // adjacent parts, a bracket spanning the whole run) from a margin
    // instead, whichever side of the panel it's closer to.
    const anchorY = ((g.y1 + g.y2) / 2) * scale
    const centerX = (g.x1 + g.x2) / 2
    const side = centerX < panelWidth / 2 ? 'left' : 'right'
    const anchorX = diagramX + (side === 'left' ? g.x1 : g.x2) * scale
    const target = side === 'left' ? leftItems : rightItems
    target.push({ key: g.ids.join('-'), anchorX, anchorY, label, labelWidth: estimateLabelWidth(label) })

    if (g.count > 1) {
      brackets.push({
        key: g.ids.join('-'),
        x1: diagramX + g.x1 * scale,
        x2: diagramX + g.x2 * scale,
        y: g.y1 * scale,
      })
    }
  }

  const leftPacked = packMarginLabels(leftItems)
  const rightPacked = packMarginLabels(rightItems)
  const totalWidth = diagramX + diagramWidth + MARGIN_GAP_IN + MARGIN_WIDTH_IN
  const totalHeight = Math.max(diagramHeight, ...leftPacked.map((i) => i.labelY + 0.1), ...rightPacked.map((i) => i.labelY + 0.1), 0)
  const rightMarginX = diagramX + diagramWidth + MARGIN_GAP_IN

  return (
    <div className="break-before-page">
      <h2 className="mb-2 text-base font-bold tracking-wide uppercase">Component Layout</h2>
      <div className="relative" style={{ width: `${totalWidth}in`, height: `${totalHeight}in` }}>
        <div
          className="absolute"
          style={{ left: `${diagramX}in`, top: 0, width: `${diagramWidth}in`, height: `${diagramHeight}in`, outline: '2px solid black' }}
        >
          {placedComponents.map((c) => {
            const b = getBounds(c)
            return (
              <div
                key={c.id}
                className="absolute border border-black/40"
                style={{
                  left: `${b.x * scale}in`,
                  top: `${b.y * scale}in`,
                  width: `${b.width * scale}in`,
                  height: `${b.height * scale}in`,
                  backgroundColor: c.color,
                }}
              />
            )
          })}
        </div>

        {inBoxLabels.map((l) => (
          <div
            key={l.key}
            className="absolute flex items-center justify-center overflow-hidden"
            style={{ left: `${l.left}in`, top: `${l.top}in`, width: `${l.width}in`, height: `${l.height}in` }}
          >
            <span
              className={`truncate px-0.5 text-[7px] leading-none font-medium ${l.dark ? 'text-white' : 'text-black'}`}
              style={l.vertical ? { writingMode: 'vertical-rl' } : undefined}
            >
              {l.text}
            </span>
          </div>
        ))}

        {brackets.map((br) => (
          <div key={br.key}>
            <div className="absolute h-px bg-red-600" style={{ left: `${br.x1}in`, top: `${br.y}in`, width: `${br.x2 - br.x1}in` }} />
            <div className="absolute w-px bg-red-600" style={{ left: `${br.x1}in`, top: `${br.y}in`, height: `${BRACKET_TICK_IN}in` }} />
            <div className="absolute w-px bg-red-600" style={{ left: `${br.x2}in`, top: `${br.y}in`, height: `${BRACKET_TICK_IN}in` }} />
          </div>
        ))}

        <svg
          className="absolute top-0 left-0"
          width={`${totalWidth}in`}
          height={`${totalHeight}in`}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        >
          {leftPacked.map((l) => (
            <line key={l.key} x1={MARGIN_WIDTH_IN} y1={l.labelY} x2={l.anchorX} y2={l.anchorY} stroke="red" strokeWidth={0.75} />
          ))}
          {rightPacked.map((l) => (
            <line key={l.key} x1={rightMarginX} y1={l.labelY} x2={l.anchorX} y2={l.anchorY} stroke="red" strokeWidth={0.75} />
          ))}
        </svg>

        {leftPacked.map((l) => (
          <span
            key={l.key}
            className="absolute -translate-y-1/2 text-[8px] whitespace-nowrap text-black"
            style={{ left: 0, top: `${l.labelY}in`, width: `${MARGIN_WIDTH_IN}in`, textAlign: 'right' }}
          >
            {l.label}
          </span>
        ))}
        {rightPacked.map((l) => (
          <span
            key={l.key}
            className="absolute -translate-y-1/2 text-[8px] whitespace-nowrap text-black"
            style={{ left: `${rightMarginX}in`, top: `${l.labelY}in` }}
          >
            {l.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-600">
        Names shown directly on components large enough to hold them. Small parts are called out from the margin
        instead — a red bracket over 2 or more identical adjacent ones labels the whole run once.
      </p>
    </div>
  )
}
