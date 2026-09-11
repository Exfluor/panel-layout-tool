function escapeCsvCell(value) {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function partsListToCsv(partsList, notes) {
  const header = ['Name', 'Part #', 'Width (in)', 'Height (in)', 'Quantity', 'Notes']
  const rows = partsList.map((p) => [p.name, p.partNumber ?? '', p.width, p.height, p.quantity, notes[p.key] ?? ''])
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
