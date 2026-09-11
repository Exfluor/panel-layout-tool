function hexToRgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const num = parseInt(h, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

// Perceived brightness (ITU-R BT.601) — below the midpoint reads as a "dark"
// fill, where black text/outlines stop being visible against it.
export function isDarkColor(hex) {
  if (!hex) return false
  try {
    const { r, g, b } = hexToRgb(hex)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5
  } catch {
    return false
  }
}
