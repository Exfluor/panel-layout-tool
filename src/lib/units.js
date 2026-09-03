const UNIT_TO_INCHES = {
  in: 1,
  '"': 1,
  mm: 1 / 25.4,
  cm: 1 / 2.54,
}

// Parses a dimension string like "3", "3.5", "3mm", "3 cm", '3"' into inches.
// A bare number (no unit) is treated as inches. Returns null if unparseable.
export function parseDimensionToInches(input) {
  if (typeof input !== 'string') return null
  const match = input.trim().match(/^(-?\d*\.?\d+)\s*(in|mm|cm|")?$/i)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value)) return null

  const unit = (match[2] ?? 'in').toLowerCase()
  const factor = UNIT_TO_INCHES[unit]
  if (factor === undefined) return null

  return Math.round(value * factor * 1000) / 1000
}
