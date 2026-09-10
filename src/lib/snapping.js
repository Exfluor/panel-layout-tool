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

// Snaps a dragged box to flush edges/alignment against other placed boxes and
// the panel walls, then clamps it fully inside the panel. Parts mounted on a
// rail (e.g. DIN rail) also snap to the rail's centerline; when that happens,
// snappedRailId identifies which rail so the UI can show a guide line. A rail
// itself also snaps to the panel's vertical center. When nothing nearby
// claims an axis and gridSnapEnabled is on, it falls back to the nearest
// 1/8" grid point — measured from `measureOffset` below `y` (whatever point
// is actually displayed/labeled for this item) so the displayed number lands
// cleanly on the grid, not just the raw top edge.
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
  const candidatesX = [{ value: 0 }, { value: panelWidth - width }]
  const candidatesY = [{ value: 0 }, { value: panelHeight - height }]

  if (centerInPanel) {
    candidatesX.push({ value: panelWidth / 2 - width / 2 })
    candidatesY.push({ value: panelHeight / 2 - height / 2 })
  }

  for (const other of others) {
    candidatesX.push(
      { value: other.x },
      { value: other.x + other.width },
      { value: other.x - width },
      { value: other.x + other.width - width },
    )
    candidatesY.push(
      { value: other.y },
      { value: other.y + other.height },
      { value: other.y - height },
      { value: other.y + other.height - height },
    )
    if (other.isRail) {
      candidatesY.push({ value: other.y + other.height / 2 - height / 2, railId: other.id })
    }
  }

  let snappedX = snapAxis(x, candidatesX, threshold)
  let snappedY = snapAxis(y, candidatesY, threshold)

  if (gridSnapEnabled) {
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
