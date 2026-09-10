export function exportLibraryToFile(library, filename = 'component-library') {
  const payload = {
    kind: 'panel-builder-component-library',
    components: library.map(({ id, ...rest }) => rest), // fresh ids assigned on import
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = filename.trim().replace(/[^a-z0-9_-]+/gi, '_') || 'component-library'
  a.href = url
  a.download = `${safeName}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Parses a library file's text content into fresh component records (new
// ids) ready to append to the current library. Throws with a readable
// message on anything that isn't a valid library export.
export function parseLibraryFile(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (typeof data !== 'object' || data === null || !Array.isArray(data.components)) {
    throw new Error('That file is not a component library export.')
  }

  return data.components
    .filter((c) => c && typeof c.name === 'string' && Number(c.width) > 0 && Number(c.height) > 0)
    .map((c) => ({
      name: c.name,
      width: Number(c.width),
      height: Number(c.height),
      color: typeof c.color === 'string' ? c.color : '#3b82f6',
      isRail: Boolean(c.isRail),
    }))
}
