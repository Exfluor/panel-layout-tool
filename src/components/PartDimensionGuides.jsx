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

// `measureY` is what the vertical guide measures/labels: a rail's centerline
// (parts mount centered on it, and grid-snap targets that same centerline),
// or a regular part's top edge otherwise. The horizontal gap lines are drawn
// through the part's true geometric center regardless, purely for placement.
export default function PartDimensionGuides({ part, panelWidth, scale, useFraction = true }) {
  const formatInches = useFraction ? formatFraction : formatDecimal
  const centerX = part.x + part.width / 2
  const centerY = part.y + part.height / 2
  const measureY = part.measureY ?? centerY
  const rightGap = panelWidth - (part.x + part.width)

  return (
    <>
      <div
        className="pointer-events-none absolute border-l border-dashed border-emerald-400"
        style={{ left: centerX * scale, top: 0, height: measureY * scale }}
      />
      <span
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap text-emerald-300"
        style={{ left: centerX * scale, top: (measureY * scale) / 2 }}
      >
        {formatInches(measureY)}
      </span>

      {part.x > EPSILON && (
        <>
          <div
            className="pointer-events-none absolute border-t border-dashed border-emerald-400"
            style={{ left: 0, top: centerY * scale, width: part.x * scale }}
          />
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap text-emerald-300"
            style={{ left: (part.x * scale) / 2, top: centerY * scale }}
          >
            {formatInches(part.x)}
          </span>
        </>
      )}

      {rightGap > EPSILON && (
        <>
          <div
            className="pointer-events-none absolute border-t border-dashed border-emerald-400"
            style={{ left: (part.x + part.width) * scale, top: centerY * scale, width: rightGap * scale }}
          />
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-neutral-900/80 px-1 text-[10px] whitespace-nowrap text-emerald-300"
            style={{ left: (part.x + part.width) * scale + (rightGap * scale) / 2, top: centerY * scale }}
          >
            {formatInches(rightGap)}
          </span>
        </>
      )}
    </>
  )
}
