function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

// Fraction display (nearest 1/16") so eighth-inch grid positions are visually
// obvious, e.g. 3.125 -> "3 1/8″" instead of a rounded "3.13".
function formatFraction(value) {
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

function formatDecimal(value) {
  return `${Math.round(value * 1000) / 1000}″`
}

const EPSILON = 0.01

export default function RailDimensionGuides({ rail, panelWidth, scale, useFraction = true }) {
  const formatInches = useFraction ? formatFraction : formatDecimal
  const centerX = rail.x + rail.width / 2
  const centerY = rail.y + rail.height / 2
  const rightGap = panelWidth - (rail.x + rail.width)

  return (
    <>
      <div
        className="pointer-events-none absolute border-l border-dashed border-emerald-400"
        style={{ left: centerX * scale, top: 0, height: centerY * scale }}
      />
      <span
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap text-emerald-300"
        style={{ left: centerX * scale, top: (centerY * scale) / 2 }}
      >
        {formatInches(centerY)}
      </span>

      {rail.x > EPSILON && (
        <>
          <div
            className="pointer-events-none absolute border-t border-dashed border-emerald-400"
            style={{ left: 0, top: centerY * scale, width: rail.x * scale }}
          />
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap text-emerald-300"
            style={{ left: (rail.x * scale) / 2, top: centerY * scale }}
          >
            {formatInches(rail.x)}
          </span>
        </>
      )}

      {rightGap > EPSILON && (
        <>
          <div
            className="pointer-events-none absolute border-t border-dashed border-emerald-400"
            style={{ left: (rail.x + rail.width) * scale, top: centerY * scale, width: rightGap * scale }}
          />
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap text-emerald-300"
            style={{ left: (rail.x + rail.width) * scale + (rightGap * scale) / 2, top: centerY * scale }}
          >
            {formatInches(rightGap)}
          </span>
        </>
      )}
    </>
  )
}
