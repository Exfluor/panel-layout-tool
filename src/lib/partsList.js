export function computePartsList(placedComponents) {
  const groups = new Map()

  for (const c of placedComponents) {
    const key = `${c.name}|${c.width}|${c.height}`
    if (!groups.has(key)) {
      groups.set(key, { key, name: c.name, width: c.width, height: c.height, color: c.color, quantity: 0 })
    }
    groups.get(key).quantity += 1
  }

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
}
