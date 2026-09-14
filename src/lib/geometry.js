export function getEffectiveSize(component) {
  const { width, height, rotation } = component
  return rotation % 180 === 0 ? { width, height } : { width: height, height: width }
}

export function getBounds(component) {
  const { x, y } = component
  const { width, height } = getEffectiveSize(component)
  return { x, y, width, height }
}

// Which pair of on-screen edges correspond to the component's chosen
// resizable dimension (its raw width or height field) — a rail's length
// stays resizable while its fixed profile depth doesn't, regardless of
// which way it's currently rotated. Raw width maps to the effective X axis
// when unrotated but to the effective Y axis at 90°/270°, and vice versa
// for raw height.
export function getResizableEdges(component) {
  const rotated = component.rotation % 180 !== 0
  const axis = component.resizableAxis === 'height' ? 'height' : 'width'
  const mapsToX = (axis === 'width') !== rotated
  return mapsToX ? ['left', 'right'] : ['top', 'bottom']
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
