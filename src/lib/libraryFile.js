export function exportLibraryToFile(library, filename = 'component-library') {
  const folders = library.filter((item) => item.isFolder)
  const folderIndexById = new Map(folders.map((f, i) => [f.id, i]))

  const payload = {
    kind: 'panel-builder-component-library',
    // Folder order is preserved as-is; components reference their folder by
    // index into this array. Fresh ids are assigned to everything on import
    // (so two libraries can be merged without id collisions), which is why
    // real ids/folderIds are dropped in favor of that index.
    folders: folders.map(({ id, isFolder, ...rest }) => rest),
    components: library
      .filter((item) => !item.isFolder)
      .map(({ id, folderId, ...rest }) => ({
        ...rest,
        folderIndex: folderId != null ? (folderIndexById.get(folderId) ?? null) : null,
      })),
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

// Parses a library file's text content into fresh folder/component records
// (no ids — the caller assigns those, resolving each component's
// folderIndex to a real folderId as it recreates the folders). Throws with a
// readable message on anything that isn't a valid library export. Files
// exported before folders existed simply have no `folders` array, which
// parses fine as "no folders".
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

  const folders = Array.isArray(data.folders)
    ? data.folders
        .filter((f) => f && typeof f.name === 'string')
        .map((f) => ({ name: f.name, collapsed: Boolean(f.collapsed) }))
    : []

  const components = data.components
    .filter((c) => c && typeof c.name === 'string' && Number(c.width) > 0 && Number(c.height) > 0)
    .map((c) => ({
      name: c.name,
      partNumber: typeof c.partNumber === 'string' ? c.partNumber : '',
      width: Number(c.width),
      height: Number(c.height),
      color: typeof c.color === 'string' ? c.color : '#3b82f6',
      isRail: Boolean(c.isRail),
      folderIndex:
        Number.isInteger(c.folderIndex) && c.folderIndex >= 0 && c.folderIndex < folders.length
          ? c.folderIndex
          : null,
    }))

  return { folders, components }
}
