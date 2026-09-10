import { useMemo, useState } from 'react'
import { getBounds, rectsOverlap } from '../lib/geometry'

const MAX_HISTORY = 5

export function usePanelLayout(initialComponents = []) {
  const [placedComponents, setPlacedComponentsRaw] = useState(initialComponents)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [history, setHistory] = useState([])

  // Every mutation goes through here, so undo works generically for any
  // action (placement, move, delete, rotate, group) without each one having
  // to manage its own history entry.
  function setPlacedComponents(updater) {
    setHistory((prev) => [...prev, placedComponents].slice(-MAX_HISTORY))
    setPlacedComponentsRaw(updater)
  }

  function undo() {
    setHistory((prev) => {
      if (prev.length === 0) return prev
      setPlacedComponentsRaw(prev[prev.length - 1])
      setSelectedIds(new Set())
      return prev.slice(0, -1)
    })
  }

  function placeNew(component, x, y) {
    const id = crypto.randomUUID()
    setPlacedComponents((prev) => {
      const isRail = component.isRail ?? false
      const newComponent = {
        id,
        name: component.name,
        width: component.width,
        height: component.height,
        color: component.color,
        isRail,
        x,
        y,
        rotation: 0,
        groupId: null,
        mountedOnRailId: null,
      }
      if (!isRail) {
        const bounds = getBounds(newComponent)
        const rail = prev.find((c) => c.isRail && rectsOverlap(bounds, getBounds(c)))
        newComponent.mountedOnRailId = rail?.id ?? null
      }
      return [...prev, newComponent]
    })
    setSelectedIds(new Set([id]))
  }

  // Moves the given components, then re-checks rail mounting for whichever of
  // them aren't rails themselves — a part that's dragged onto a rail mounts on
  // it automatically, and one dragged away detaches, without any manual grouping.
  function moveGroup(ids, deltaX, deltaY) {
    if (deltaX === 0 && deltaY === 0) return
    setPlacedComponents((prev) => {
      const moved = prev.map((c) => (ids.includes(c.id) ? { ...c, x: c.x + deltaX, y: c.y + deltaY } : c))
      return moved.map((c) => {
        if (!ids.includes(c.id) || c.isRail) return c
        const bounds = getBounds(c)
        const rail = moved.find((other) => other.isRail && rectsOverlap(bounds, getBounds(other)))
        return { ...c, mountedOnRailId: rail?.id ?? null }
      })
    })
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
    setPlacedComponents((prev) => {
      const deletedRailIds = new Set(prev.filter((c) => selectedIds.has(c.id) && c.isRail).map((c) => c.id))
      return prev
        .filter((c) => !selectedIds.has(c.id))
        .map((c) => (deletedRailIds.has(c.mountedOnRailId) ? { ...c, mountedOnRailId: null } : c))
    })
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
    undo,
    canUndo: history.length > 0,
  }
}
