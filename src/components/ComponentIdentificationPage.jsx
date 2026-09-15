import { getBounds } from '../lib/geometry'
import { isDarkColor } from '../lib/color'

// One section per DIN rail (cropped tight to that rail's own row, not the
// whole panel — the panel-wide view is the rail measurements page), so a
// crowded row's callouts only ever compete with that row's own leftovers,
// not the whole panel's. Readability over density: a name only goes
// in-place if it comfortably fits the actual text, not just barely.
//
// Anything too small for its name gets a short letter tag (A, B, C…)
// instead, placed right on every one of its occurrences (grouped with a
// bracket for a run of 2+ touching identical parts), with a compact legend
// below the row mapping each tag back to its name. A component scattered
// across several spots on the same rail is still named once — every
// occurrence just gets the same tag — rather than drawing a leader line to
// each one, which tangles badly once several interleaved part types are
// each scattered many times (e.g. a long strip of alternating terminal
// blocks).
const PAGE_WIDTH_IN = 7
const CHAR_WIDTH_IN = 0.05
const LABEL_PADDING_IN = 0.1
const MIN_THICKNESS_IN = 0.15
const BRACKET_RAISE_IN = 0.07 // how far above the part's top edge the bracket floats, clear of it
const BRACKET_TICK_IN = BRACKET_RAISE_IN // ticks reach back down to touch the part
const TAG_GAP_IN = 0.03 // gap between the bracket line and the tag sitting above it
const TAG_HEIGHT_IN = 0.13
const TAG_TIER_STEP_IN = 0.15 // vertical spacing between the two tag tiers
const TAG_TIERS = 2
const TAG_MARGIN_IN = BRACKET_RAISE_IN + TAG_GAP_IN + TAG_HEIGHT_IN + (TAG_TIERS - 1) * TAG_TIER_STEP_IN
const SECTION_GAP_IN = 0.3

function isSkippedFromLabeling(c) {
  // No formal "wireway" type exists on a component — Panduit is matched by
  // name instead, the established naming convention (e.g. `2" Panduit`).
  // Rails and Panduit are already named on the rail measurements page.
  return c.isRail || /panduit/i.test(c.name)
}

function typeKey(c) {
  return `${c.name}|${c.partNumber ?? ''}|${Math.round(c.width * 1000) / 1000}|${Math.round(c.height * 1000) / 1000}`
}

function estimateLabelWidth(text) {
  return text.length * CHAR_WIDTH_IN + LABEL_PADDING_IN
}

// A, B, C, … Z, AA, AB, … — same scheme spreadsheet columns use.
function tagFor(index) {
  let n = index
  let tag = ''
  do {
    tag = String.fromCharCode(65 + (n % 26)) + tag
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return tag
}

function tagBadgeWidth(tag) {
  return tag.length * 0.06 + 0.08
}

// Tightly-packed small parts (e.g. a strip of narrow terminal blocks) can
// sit closer together than a tag badge is wide, which would otherwise
// overlap neighboring badges — alternates tags between two tiers (like the
// bracket labels did) so neighbors aren't all fighting for the same
// horizontal space, packing each tier left-to-right with a minimum gap and
// nudging a badge off-center from its part only when it must to avoid its
// same-tier neighbor.
function packTags(items) {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const prevRight = [-Infinity, -Infinity]
  return sorted.map((item, i) => {
    const tier = i % TAG_TIERS
    const width = tagBadgeWidth(item.tag)
    const left = Math.max(item.x - width / 2, prevRight[tier] + 0.02)
    prevRight[tier] = left + width
    return { ...item, x: left + width / 2, tier }
  })
}

function clusterBounds(members) {
  const bounds = members.map((m) => m.b)
  return {
    ids: members.map((m) => m.c.id),
    count: members.length,
    x1: Math.min(...bounds.map((b) => b.x)),
    x2: Math.max(...bounds.map((b) => b.x + b.width)),
    y1: Math.min(...bounds.map((b) => b.y)),
    y2: Math.max(...bounds.map((b) => b.y + b.height)),
  }
}

// Every component of the identical type on this rail is one group, named
// once — not just a contiguous touching run of them. Within that, adjacent
// touching ones still form their own "cluster" (its own bracket, if 2+).
function buildGroups(components) {
  const sorted = components.map((c) => ({ c, b: getBounds(c) })).sort((a, b) => a.b.x - b.b.x)

  const rawClusters = []
  let i = 0
  while (i < sorted.length) {
    const key = typeKey(sorted[i].c)
    let j = i + 1
    while (
      j < sorted.length &&
      typeKey(sorted[j].c) === key &&
      // Small terminal blocks/end plates often sit with a hair of a gap
      // (mounting feet, dividers) even when logically "adjacent" — too
      // tight a tolerance here was leaving genuinely side-by-side identical
      // parts ungrouped.
      Math.abs(sorted[j].b.x - (sorted[j - 1].b.x + sorted[j - 1].b.width)) < 0.15
    ) {
      j++
    }
    rawClusters.push({ key, members: sorted.slice(i, j) })
    i = j
  }

  const byKey = new Map()
  for (const { key, members } of rawClusters) {
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(members)
  }

  return [...byKey.values()].map((clusterMembersList) => {
    const clusters = clusterMembersList.map(clusterBounds)
    const allMembers = clusterMembersList.flat()
    return {
      ids: allMembers.map((m) => m.c.id),
      name: allMembers[0].c.name,
      color: allMembers[0].c.color,
      count: allMembers.length,
      clusters,
    }
  })
}

// One DIN rail plus everything mounted on it, cropped tight and scaled up
// to use the full page width.
function RailSection({ rail, mountedParts }) {
  const railBounds = getBounds(rail)
  const allBounds = [railBounds, ...mountedParts.map(getBounds)]
  const rowX1 = Math.min(...allBounds.map((b) => b.x))
  const rowX2 = Math.max(...allBounds.map((b) => b.x + b.width))
  const rowY1 = Math.min(...allBounds.map((b) => b.y))
  const rowY2 = Math.max(...allBounds.map((b) => b.y + b.height))
  const scale = PAGE_WIDTH_IN / (rowX2 - rowX1)

  const groups = buildGroups([rail, ...mountedParts])
  const inBoxLabels = []
  const brackets = []
  const tags = []
  const legend = []
  let tagIndex = 0

  for (const g of groups) {
    const label = g.count > 1 ? `${g.name} (×${g.count})` : g.name
    const scaledClusters = g.clusters.map((c) => ({
      x1: (c.x1 - rowX1) * scale,
      x2: (c.x2 - rowX1) * scale,
      y1: (c.y1 - rowY1) * scale,
      y2: (c.y2 - rowY1) * scale,
      count: c.count,
    }))

    // Only a group that's one single contiguous cluster can sensibly hold
    // its full name in place — one scattered across the rail in several
    // clusters always gets tagged instead, since there's no single spot to
    // put the text.
    if (g.clusters.length === 1) {
      const only = scaledClusters[0]
      const w = only.x2 - only.x1
      const h = only.y2 - only.y1
      const needed = estimateLabelWidth(label)
      const fitsHorizontal = w >= needed && h >= MIN_THICKNESS_IN
      const fitsVertical = h >= needed && w >= MIN_THICKNESS_IN

      if (fitsHorizontal || fitsVertical) {
        inBoxLabels.push({
          key: g.ids.join('-'),
          left: only.x1,
          top: only.y1,
          width: w,
          height: h,
          text: label,
          vertical: !fitsHorizontal && fitsVertical,
          dark: isDarkColor(g.color),
        })
        continue
      }
    }

    const tag = tagFor(tagIndex++)
    legend.push({ key: g.ids.join('-'), tag, text: label })
    scaledClusters.forEach((c, idx) => {
      tags.push({ key: `${g.ids.join('-')}-${idx}`, tag, x: (c.x1 + c.x2) / 2, y: c.y1 - BRACKET_RAISE_IN })
      if (c.count > 1) {
        brackets.push({ key: `${g.ids.join('-')}-${idx}`, x1: c.x1, x2: c.x2, y: c.y1 - BRACKET_RAISE_IN })
      }
    })
  }

  const packedTags = packTags(tags)
  const rowWidth = (rowX2 - rowX1) * scale
  const rowHeight = (rowY2 - rowY1) * scale

  return (
    <div>
      <div className="relative" style={{ width: `${rowWidth}in`, height: `${rowHeight + TAG_MARGIN_IN}in` }}>
        <div className="absolute" style={{ left: 0, top: `${TAG_MARGIN_IN}in`, width: `${rowWidth}in`, height: `${rowHeight}in` }}>
          {[rail, ...mountedParts].map((c) => {
            const b = getBounds(c)
            return (
              <div
                key={c.id}
                className="absolute border border-black/40"
                style={{
                  left: `${(b.x - rowX1) * scale}in`,
                  top: `${(b.y - rowY1) * scale}in`,
                  width: `${b.width * scale}in`,
                  height: `${b.height * scale}in`,
                  backgroundColor: c.color,
                }}
              />
            )
          })}

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
        </div>

        {packedTags.map((t) => (
          <span
            key={t.key}
            className="absolute -translate-x-1/2 -translate-y-full rounded-sm border border-red-600 bg-white px-0.5 text-[7px] leading-tight font-bold text-red-700"
            style={{ left: `${t.x}in`, top: `${TAG_MARGIN_IN + t.y - TAG_GAP_IN - t.tier * TAG_TIER_STEP_IN}in` }}
          >
            {t.tag}
          </span>
        ))}
      </div>

      {legend.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] text-black">
          {legend.map((entry) => (
            <span key={entry.key}>
              <span className="font-bold text-red-700">{entry.tag}</span> — {entry.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ComponentIdentificationPage({ placedComponents }) {
  const rails = placedComponents.filter((c) => c.isRail)
  if (rails.length === 0) return null

  return (
    <div className="break-before-page">
      <h2 className="mb-2 text-base font-bold tracking-wide uppercase">Component Layout</h2>
      <div className="flex flex-col" style={{ gap: `${SECTION_GAP_IN}in` }}>
        {rails.map((rail) => {
          const mountedParts = placedComponents.filter((c) => c.mountedOnRailId === rail.id)
          return <RailSection key={rail.id} rail={rail} mountedParts={mountedParts} />
        })}
      </div>
      <p className="mt-2 text-xs text-neutral-600">
        One section per DIN rail. Names shown directly on parts that comfortably fit them. Anything tighter (or a
        type scattered across several spots on the same rail) gets a letter tag on every occurrence instead — a red
        bracket over 2 or more identical adjacent parts — with a legend below the row mapping each tag to its name.
      </p>
    </div>
  )
}
