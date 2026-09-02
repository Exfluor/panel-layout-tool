import { useMemo, useState } from 'react'
import { getBounds, rectsOverlap } from '../lib/geometry'

export function usePanelLayout(initialComponents = []) {
  const [placedComponents, setPlacedComponents] = useState(initialComponents)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  function placeNew(component, x, y) {
    const id = crypto.randomUUID()
    setPlacedComponents((prev) => [
      ...prev,
      {
        id,
        name: component.name,
        width: component.width,
        height: component.height,
        color: component.color,
        isRail: component.isRail ?? false,
        x,
        y,
        rotation: 0,
        groupId: null,
      },
    ])
    setSelectedIds(new Set([id]))
  }

  function moveGroup(ids, deltaX, deltaY) {
    if (deltaX === 0 && deltaY === 0) return
    setPlacedComponents((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, x: c.x + deltaX, y: c.y + deltaY } : c)),
    )
  }

  function select(id, { additive = false } = {}) {
    const target = placedComponents.find((c) => c.id === id)
    if (!target) return

    const groupIds = target.groupId
      ? placedComponents.filter((c) => c.groupId === target.groupId).map((c) => c.id)
      : [id]

    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev)
        const allSelected = groupIds.every((gid) => next.has(gid))
        groupIds.forEach((gid) => (allSelected ? next.delete(gid) : next.add(gid)))
        return next
      }
      return new Set(groupIds)
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function deleteSelected() {
    setPlacedComponents((prev) => prev.filter((c) => !selectedIds.has(c.id)))
    setSelectedIds(new Set())
  }

  function rotateSelected() {
    setPlacedComponents((prev) =>
      prev.map((c) => (selectedIds.has(c.id) ? { ...c, rotation: (c.rotation + 90) % 360 } : c)),
    )
  }

  function groupSelected() {
    if (selectedIds.size < 2) return
    const groupId = crypto.randomUUID()
    setPlacedComponents((prev) => prev.map((c) => (selectedIds.has(c.id) ? { ...c, groupId } : c)))
  }

  function ungroupSelected() {
    setPlacedComponents((prev) => prev.map((c) => (selectedIds.has(c.id) ? { ...c, groupId: null } : c)))
  }

  const overlappingIds = useMemo(() => {
    const result = new Set()
    for (let i = 0; i < placedComponents.length; i++) {
      for (let j = i + 1; j < placedComponents.length; j++) {
        const compA = placedComponents[i]
        const compB = placedComponents[j]
        if (Boolean(compA.isRail) !== Boolean(compB.isRail)) continue // parts mount on rails; not a real conflict

        const a = getBounds(compA)
        const b = getBounds(compB)
        if (rectsOverlap(a, b)) {
          result.add(compA.id)
          result.add(compB.id)
        }
      }
    }
    return result
  }, [placedComponents])

  return {
    placedComponents,
    setPlacedComponents,
    selectedIds,
    overlappingIds,
    placeNew,
    moveGroup,
    select,
    clearSelection,
    deleteSelected,
    rotateSelected,
    groupSelected,
    ungroupSelected,
  }
}
