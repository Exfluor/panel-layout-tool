export function exportProjectToFile(project) {
  const payload = {
    name: project.name,
    panelWidth: project.panelWidth,
    panelHeight: project.panelHeight,
    placedComponents: project.placedComponents,
    componentLibrary: project.componentLibrary,
    partNotes: project.partNotes,
    exportedAt: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = (project.name || 'panel').trim().replace(/[^a-z0-9_-]+/gi, '_') || 'panel'
  a.href = url
  a.download = `${safeName}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Appends an "(imported)" / "(imported 2)" suffix until the name no longer
// collides with an existing project name (case-insensitive).
export function dedupeProjectName(baseName, existingNames) {
  const taken = new Set([...existingNames].map((n) => n.trim().toLowerCase()))
  if (!taken.has(baseName.trim().toLowerCase())) return baseName

  let candidate = `${baseName} (imported)`
  let i = 2
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${baseName} (imported ${i})`
    i++
  }
  return candidate
}

// Parses an exported project file's text content back into a saved-project
// record, assigning a fresh id/timestamps so importing the same file twice
// (or a file shared by someone else) never collides with an existing project.
export function parseProjectFile(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('That file is not a valid project.')
  }

  const { name, panelWidth, panelHeight, placedComponents, componentLibrary, partNotes } = data

  if (!(Number(panelWidth) > 0) || !(Number(panelHeight) > 0)) {
    throw new Error('That file is missing valid panel dimensions.')
  }
  if (!Array.isArray(placedComponents)) {
    throw new Error('That file is missing its placed components.')
  }
  if (!Array.isArray(componentLibrary)) {
    throw new Error('That file is missing its component library.')
  }

  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: typeof name === 'string' && name.trim() ? name.trim() : 'Imported panel',
    panelWidth: Number(panelWidth),
    panelHeight: Number(panelHeight),
    placedComponents,
    componentLibrary,
    partNotes: partNotes && typeof partNotes === 'object' ? partNotes : {},
    createdAt: now,
    updatedAt: now,
  }
}
