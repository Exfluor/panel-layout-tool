// Rounds to the thousandth of an inch — fine enough to never matter
// physically, but coarse enough to absorb the floating-point noise that
// drag/resize math can leave behind (e.g. 22.700000000000003), so visually
// identical parts group into one BOM row instead of splitting into several.
function round3(value) {
  return Math.round(value * 1000) / 1000
}

export function computePartsList(placedComponents) {
  const groups = new Map()

  for (const c of placedComponents) {
    const partNumber = c.partNumber ?? ''
    const width = round3(c.width)
    const height = round3(c.height)
    const key = `${c.name}|${partNumber}|${width}|${height}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: c.name,
        partNumber,
        width,
        height,
        color: c.color,
        quantity: 0,
        ids: [],
      })
    }
    const group = groups.get(key)
    group.quantity += 1
    group.ids.push(c.id)
  }

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
}
