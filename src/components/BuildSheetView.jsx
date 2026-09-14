import { isDarkColor } from '../lib/color'
import { getEffectiveSize } from '../lib/geometry'

// Fits the panel into a fixed print-safe box, in CSS inches so it renders
// at a predictable, consistent size both on screen and on paper (a US
// Letter page minus margins is ~7.5in wide).
const DIAGRAM_MAX_WIDTH_IN = 6.5
const DIAGRAM_MAX_HEIGHT_IN = 4.5

function PanelDiagram({ panelWidth, panelHeight, placedComponents }) {
  if (!(panelWidth > 0) || !(panelHeight > 0)) return null
  const scale = Math.min(DIAGRAM_MAX_WIDTH_IN / panelWidth, DIAGRAM_MAX_HEIGHT_IN / panelHeight)

  return (
    <div
      className="relative border-2 border-black"
      style={{ width: `${panelWidth * scale}in`, height: `${panelHeight * scale}in` }}
    >
      {[...placedComponents]
        .sort((a, b) => (a.isRail === b.isRail ? 0 : a.isRail ? -1 : 1))
        .map((c) => {
          const { width, height } = getEffectiveSize(c)
          const dark = isDarkColor(c.color)
          return (
            <div
              key={c.id}
              className={`absolute flex items-center justify-center overflow-hidden border border-black/40 text-[7px] leading-tight font-medium ${dark ? 'text-white' : 'text-black'}`}
              style={{
                left: `${c.x * scale}in`,
                top: `${c.y * scale}in`,
                width: `${width * scale}in`,
                height: `${height * scale}in`,
                backgroundColor: c.color,
              }}
            >
              <span className="truncate px-0.5">{c.name}</span>
            </div>
          )
        })}
    </div>
  )
}

// A printable technician build sheet: project title, a diagram of the
// panel, and a Bill of Materials. This is v1 — a later iteration adds
// annotated views (rail measurements, labeled/arrowed layout with
// identical-adjacent parts bracketed together). Deliberately styled
// light-on-white regardless of the app's dark theme, since it's meant to be
// read on paper.
export default function BuildSheetView({ projectName, panelWidth, panelHeight, placedComponents, partsList, partNotes, onClose }) {
  const totalCount = partsList.reduce((sum, p) => sum + p.quantity, 0)
  const today = new Date().toLocaleDateString()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/80">
      <div className="mx-auto my-6 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <p className="text-sm text-neutral-300">Build sheet preview — use your browser's print dialog to save as PDF.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-600 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            Close
          </button>
        </div>
      </div>

      <div
        id="build-sheet-print"
        className="mx-auto mb-10 max-w-3xl bg-white p-10 text-black shadow-xl print:m-0 print:max-w-none print:p-0 print:shadow-none"
      >
        <div className="mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold">{projectName || 'Untitled panel'}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {panelWidth}&Prime; &times; {panelHeight}&Prime; internal &middot; Generated {today}
          </p>
        </div>

        <h2 className="mb-2 text-base font-bold tracking-wide uppercase">Panel layout</h2>
        <div className="mb-6 flex justify-center">
          <PanelDiagram panelWidth={panelWidth} panelHeight={panelHeight} placedComponents={placedComponents} />
        </div>

        <h2 className="mb-2 text-base font-bold tracking-wide uppercase">Bill of Materials</h2>
        {partsList.length === 0 ? (
          <p className="text-sm text-neutral-600">No components placed on this panel.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-1.5 pr-3 font-semibold">Name</th>
                <th className="py-1.5 pr-3 font-semibold">Part #</th>
                <th className="py-1.5 pr-3 font-semibold">Dimensions</th>
                <th className="py-1.5 pr-3 font-semibold">Qty</th>
                <th className="py-1.5 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {partsList.map((part) => (
                <tr key={part.key} className="border-b border-neutral-300">
                  <td className="py-1.5 pr-3">{part.name}</td>
                  <td className="py-1.5 pr-3 text-neutral-700">{part.partNumber || '—'}</td>
                  <td className="py-1.5 pr-3 text-neutral-700">
                    {part.width}&Prime; &times; {part.height}&Prime;
                  </td>
                  <td className="py-1.5 pr-3 text-neutral-700">{part.quantity}</td>
                  <td className="py-1.5 text-neutral-700">{partNotes?.[part.key] || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black text-sm font-semibold">
                <td className="py-1.5" colSpan={3}>
                  Total
                </td>
                <td className="py-1.5">{totalCount}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
