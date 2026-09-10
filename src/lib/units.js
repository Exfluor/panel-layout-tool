const UNIT_TO_INCHES = {
  in: 1,
  '"': 1,
  mm: 1 / 25.4,
  cm: 1 / 2.54,
}

// Parses a dimension string like "3", "3.5", "3mm", "3 cm", '3"', "2 1/2",
// "2-1/2", or "1/2" into inches. A bare number (no unit) is treated as
// inches; fractions are inches-only (no real-world use for "2 1/2mm").
// Returns null if unparseable.
export function parseDimensionToInches(input) {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()

  const fractionMatch = trimmed.match(/^(\d+)?[\s-]*?(\d+)\/(\d+)\s*(in|")?$/i)
  if (fractionMatch) {
    const whole = fractionMatch[1] ? Number(fractionMatch[1]) : 0
    const numerator = Number(fractionMatch[2])
    const denominator = Number(fractionMatch[3])
    if (denominator === 0) return null
    return Math.round((whole + numerator / denominator) * 1000) / 1000
  }

  const match = trimmed.match(/^(-?\d*\.?\d+)\s*(in|mm|cm|")?$/i)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value)) return null

  const unit = (match[2] ?? 'in').toLowerCase()
  const factor = UNIT_TO_INCHES[unit]
  if (factor === undefined) return null

  return Math.round(value * factor * 1000) / 1000
}
