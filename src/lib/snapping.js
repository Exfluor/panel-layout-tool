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
// snappedRailId identifies which rail so the UI can show a guide line.
export function computeSnappedPosition({ x, y, width, height, others, panelWidth, panelHeight, threshold }) {
  const candidatesX = [{ value: 0 }, { value: panelWidth - width }]
  const candidatesY = [{ value: 0 }, { value: panelHeight - height }]

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

  const snappedX = snapAxis(x, candidatesX, threshold)
  const snappedY = snapAxis(y, candidatesY, threshold)

  const clampedX = Math.min(Math.max(snappedX.value, 0), Math.max(0, panelWidth - width))
  const clampedY = Math.min(Math.max(snappedY.value, 0), Math.max(0, panelHeight - height))

  return {
    x: clampedX,
    y: clampedY,
    snappedRailId: clampedY === snappedY.value ? (snappedY.railId ?? null) : null,
  }
}
