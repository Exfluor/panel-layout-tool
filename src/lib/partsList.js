export function computePartsList(placedComponents) {
  const groups = new Map()

  for (const c of placedComponents) {
    const partNumber = c.partNumber ?? ''
    const key = `${c.name}|${partNumber}|${c.width}|${c.height}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: c.name,
        partNumber,
        width: c.width,
        height: c.height,
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
