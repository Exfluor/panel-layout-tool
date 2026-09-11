export function getEffectiveSize(component) {
  const { width, height, rotation } = component
  return rotation % 180 === 0 ? { width, height } : { width: height, height: width }
}

export function getBounds(component) {
  const { x, y } = component
  const { width, height } = getEffectiveSize(component)
  return { x, y, width, height }
}

export function rectsOverlap(a, b, epsilon = 0.02) {
  return (
    a.x + epsilon < b.x + b.width &&
    a.x + a.width - epsilon > b.x &&
    a.y + epsilon < b.y + b.height &&
    a.y + a.height - epsilon > b.y
  )
}

// True when `inner` is entirely inside `outer` (used for "window" selection —
// dragging left-to-right — as opposed to `rectsOverlap`'s "crossing" touch test).
export function rectContains(outer, inner, epsilon = 0.02) {
  return (
    inner.x + epsilon >= outer.x &&
    inner.y + epsilon >= outer.y &&
    inner.x + inner.width - epsilon <= outer.x + outer.width &&
    inner.y + inner.height - epsilon <= outer.y + outer.height
  )
}
