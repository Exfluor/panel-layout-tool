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
