const GRID_STEP = 0.125 // fallback grid (1/8") when nothing nearby to snap to

function quantize(value) {
  return Math.round(value / GRID_STEP) * GRID_STEP
}

function snapAxis(value, candidates, threshold) {
  let best = { value, meta: null }
  let bestDist = threshold
  for (const candidate of candidates) {
    const dist = Math.abs(candidate.value - value)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  return best
}

// A rail snapping to the panel's center, a part snapping to the centerline
// of a rail it's near, and a part's left/right edges snapping flush against
// a neighboring part's edges (how parts butt together with no gap along a
// rail) are structural alignments (not just a rounding convenience) — they
// stay live regardless of the grid-snap toggle. Everything else (top/bottom
// stacking against other parts, panel walls, the 1/8" grid fallback) only
// kicks in when gridSnapEnabled is on; off, the box moves exactly with the
// pointer except for these, only clamped to stay in-panel.
export function computeSnappedPosition({
  x,
  y,
  width,
  height,
  others,
  panelWidth,
  panelHeight,
  threshold,
  centerInPanel = false,
  gridSnapEnabled = true,
  measureOffset = 0,
}) {
  const alwaysCandidatesX = []
  const alwaysCandidatesY = []

  if (centerInPanel) {
    alwaysCandidatesX.push({ value: panelWidth / 2 - width / 2 })
    alwaysCandidatesY.push({ value: panelHeight / 2 - height / 2 })
  }
  for (const other of others) {
    alwaysCandidatesX.push(
      { value: other.x },
      { value: other.x + other.width },
      { value: other.x - width },
      { value: other.x + other.width - width },
    )
    if (other.isRail) {
      alwaysCandidatesY.push({ value: other.y + other.height / 2 - height / 2, railId: other.id })
    }
  }

  let snappedX = snapAxis(x, alwaysCandidatesX, threshold)
  let snappedY = snapAxis(y, alwaysCandidatesY, threshold)

  if (gridSnapEnabled) {
    const candidatesX = [{ value: 0 }, { value: panelWidth - width }, ...alwaysCandidatesX]
    const candidatesY = [{ value: 0 }, { value: panelHeight - height }, ...alwaysCandidatesY]

    for (const other of others) {
      candidatesY.push(
        { value: other.y },
        { value: other.y + other.height },
        { value: other.y - height },
        { value: other.y + other.height - height },
      )
    }

    snappedX = snapAxis(x, candidatesX, threshold)
    snappedY = snapAxis(y, candidatesY, threshold)

    // X is measured/displayed edge-to-wall, so grid-snap the edge. Y grid-snaps
    // whatever point is actually displayed (measureOffset below y) — otherwise
    // a gridded top edge can produce an off-grid displayed value whenever the
    // offset isn't itself a multiple of the grid step.
    if (snappedX.value === x) snappedX = { value: quantize(x) }
    if (snappedY.value === y) snappedY = { value: quantize(y + measureOffset) - measureOffset }
  }

  const clampedX = Math.min(Math.max(snappedX.value, 0), Math.max(0, panelWidth - width))
  const clampedY = Math.min(Math.max(snappedY.value, 0), Math.max(0, panelHeight - height))

  return {
    x: clampedX,
    y: clampedY,
    snappedRailId: clampedY === snappedY.value ? (snappedY.railId ?? null) : null,
  }
}
