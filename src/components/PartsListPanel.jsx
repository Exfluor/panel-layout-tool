import { useState } from 'react'
import { downloadCsv, partsListToCsv } from '../lib/csv'

export default function PartsListPanel({ partsList, notes, onNotesChange }) {
  const [collapsed, setCollapsed] = useState(true)
  const totalCount = partsList.reduce((sum, p) => sum + p.quantity, 0)

  function handleExport() {
    downloadCsv('parts-list.csv', partsListToCsv(partsList, notes))
  }

  return (
    <div className="border-t border-neutral-700">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-sm font-medium text-neutral-200"
        >
          <span className="inline-block w-3 text-neutral-400">{collapsed ? '▸' : '▾'}</span>
          Parts list
          <span className="text-neutral-400">
            ({partsList.length} type{partsList.length === 1 ? '' : 's'}, {totalCount} total)
          </span>
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={partsList.length === 0}
          className="rounded border border-neutral-600 px-3 py-1 text-xs hover:bg-neutral-800 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {!collapsed && (
        <div className="max-h-64 overflow-y-auto border-t border-neutral-800 px-4 pb-3">
          {partsList.length === 0 ? (
            <p className="py-3 text-center text-xs text-neutral-500">No components placed yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-neutral-400">
                  <th className="py-1.5 pr-3 font-medium">Name</th>
                  <th className="py-1.5 pr-3 font-medium">Dimensions</th>
                  <th className="py-1.5 pr-3 font-medium">Qty</th>
                  <th className="py-1.5 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {partsList.map((part) => (
                  <tr key={part.key} className="border-t border-neutral-800">
                    <td className="py-1.5 pr-3">
                      <span
                        className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                        style={{ backgroundColor: part.color }}
                      />
                      {part.name}
                    </td>
                    <td className="py-1.5 pr-3 text-neutral-300">
                      {part.width}&Prime; &times; {part.height}&Prime;
                    </td>
                    <td className="py-1.5 pr-3 text-neutral-300">{part.quantity}</td>
                    <td className="py-1.5">
                      <input
                        type="text"
                        value={notes[part.key] ?? ''}
                        onChange={(e) => onNotesChange(part.key, e.target.value)}
                        placeholder="Notes..."
                        className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs outline-none focus:border-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-700 text-xs text-neutral-400">
                  <td className="py-1.5" colSpan={2}>
                    Total
                  </td>
                  <td className="py-1.5">{totalCount}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
