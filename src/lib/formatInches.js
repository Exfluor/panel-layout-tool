function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

// Fraction display (nearest 1/16") so eighth-inch grid positions are visually
// obvious, e.g. 3.125 -> "3 1/8″" instead of a rounded "3.13".
export function formatFraction(value) {
  const denominator = 16
  const whole = Math.floor(value + 1e-6)
  let numerator = Math.round((value - whole) * denominator)
  let wholePart = whole

  if (numerator === denominator) {
    numerator = 0
    wholePart += 1
  }

  if (numerator === 0) return `${wholePart}″`

  const g = gcd(numerator, denominator)
  const fraction = `${numerator / g}/${denominator / g}`
  return wholePart > 0 ? `${wholePart} ${fraction}″` : `${fraction}″`
}

export function formatDecimal(value) {
  return `${Math.round(value * 1000) / 1000}″`
}

export function formatInches(value, useFraction = true) {
  return useFraction ? formatFraction(value) : formatDecimal(value)
}
