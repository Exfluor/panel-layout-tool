import { useMemo, useState } from 'react'
import { getBounds, rectsOverlap } from '../lib/geometry'

const MAX_HISTORY = 5

export function usePanelLayout(initialComponents = []) {
  const [placedComponents, setPlacedComponentsRaw] = useState(initialComponents)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [history, setHistory] = useState([])
  const [lastPlacement, setLastPlacement] = useState(null)
  const [clipboard, setClipboard] = useState(null)

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
    placeMultiple(component, x, y, 1)
  }

  // Places `quantity` copies flush in a row starting at (x, y), extending
  // along X by the component's own width — one drag places a whole row
  // instead of N separate drags. Also remembers where the row ended so
  // repeatLastPlacement can continue it.
  function placeMultiple(component, x, y, quantity = 1) {
    const count = Math.max(1, Math.floor(quantity))
    const isRail = component.isRail ?? false
    const ids = Array.from({ length: count }, () => crypto.randomUUID())

    setPlacedComponents((prev) => {
      let working = prev
      for (let i = 0; i < count; i++) {
        const newComponent = {
          id: ids[i],
          name: component.name,
          width: component.width,
          height: component.height,
          color: component.color,
          isRail,
          x: x + i * component.width,
          y,
          rotation: 0,
          groupId: null,
          mountedOnRailId: null,
          locked: false,
        }
        if (!isRail) {
          const bounds = getBounds(newComponent)
          const rail = working.find((c) => c.isRail && rectsOverlap(bounds, getBounds(c)))
          newComponent.mountedOnRailId = rail?.id ?? null
        }
        working = [...working, newComponent]
      }
      return working
    })

    setSelectedIds(new Set(ids))
    setLastPlacement({ component, nextX: x + count * component.width, y, quantity: count })
    return ids
  }

  function repeatLastPlacement() {
    if (!lastPlacement) return
    const { component, nextX, y, quantity } = lastPlacement
    placeMultiple(component, nextX, y, quantity)
  }

  // Which components move together with `primary` — its manual group (if
  // any), plus everything mounted on it if it's a rail — excluding anything
  // locked. Shared by dragging and by direct dimension edits so both move
  // things identically.
  function getMovableGroupIds(primary) {
    let ids = primary.groupId
      ? placedComponents.filter((c) => c.groupId === primary.groupId && !c.locked).map((c) => c.id)
      : [primary.id]

    if (primary.isRail) {
      const mountedIds = placedComponents
        .filter((c) => c.mountedOnRailId === primary.id && !c.locked)
        .map((c) => c.id)
      ids = Array.from(new Set([...ids, ...mountedIds]))
    }
    return ids
  }

  // Moves a single component (and whatever moves with it) by a delta,
  // matching drag semantics exactly — used for direct dimension edits.
  function moveComponentBy(id, deltaX, deltaY) {
    const primary = placedComponents.find((c) => c.id === id)
    if (!primary || primary.locked) return
    moveGroup(getMovableGroupIds(primary), deltaX, deltaY)
  }

  // Moves the given components, then re-checks rail mounting for whichever of
  // them aren't rails themselves — a part that's dragged onto a rail mounts on
  // it automatically, and one dragged away detaches, without any manual grouping.
  function moveGroup(ids, deltaX, deltaY) {
    if (deltaX === 0 && deltaY === 0) return
    setLastPlacement(null)
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

  function selectByIds(ids, { additive = false } = {}) {
    setLastPlacement(null)
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      }
      return new Set(ids)
    })
  }

  function select(id, { additive = false } = {}) {
    const target = placedComponents.find((c) => c.id === id)
    if (!target) return
    setLastPlacement(null)

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
    setLastPlacement(null)
    setSelectedIds(new Set())
  }

  function deleteSelected() {
    setLastPlacement(null)
    setPlacedComponents((prev) => {
      const deletedRailIds = new Set(prev.filter((c) => selectedIds.has(c.id) && c.isRail).map((c) => c.id))
      return prev
        .filter((c) => !selectedIds.has(c.id))
        .map((c) => (deletedRailIds.has(c.mountedOnRailId) ? { ...c, mountedOnRailId: null } : c))
    })
    setSelectedIds(new Set())
  }

  function rotateSelected() {
    setLastPlacement(null)
    setPlacedComponents((prev) =>
      prev.map((c) => (selectedIds.has(c.id) ? { ...c, rotation: (c.rotation + 90) % 360 } : c)),
    )
  }

  function groupSelected() {
    if (selectedIds.size < 2) return
    setLastPlacement(null)
    const groupId = crypto.randomUUID()
    setPlacedComponents((prev) => prev.map((c) => (selectedIds.has(c.id) ? { ...c, groupId } : c)))
  }

  function ungroupSelected() {
    setLastPlacement(null)
    setPlacedComponents((prev) => prev.map((c) => (selectedIds.has(c.id) ? { ...c, groupId: null } : c)))
  }

  function toggleLock(id) {
    setLastPlacement(null)
    setPlacedComponents((prev) => prev.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c)))
  }

  function copySelected() {
    const items = placedComponents.filter((c) => selectedIds.has(c.id))
    if (items.length === 0) return
    setClipboard(items.map((c) => ({ ...c })))
  }

  // Pastes the clipboard as fresh components offset from their original
  // spot, preserving relative positions/rotation and re-forming any shared
  // group under a new id. Rail mounting is recomputed at the new position
  // rather than carried over.
  const PASTE_OFFSET = 0.5

  function pasteClipboard() {
    if (!clipboard || clipboard.length === 0) return
    setLastPlacement(null)

    const groupIdMap = new Map()
    const pasted = clipboard.map((c) => {
      let newGroupId = null
      if (c.groupId) {
        if (!groupIdMap.has(c.groupId)) groupIdMap.set(c.groupId, crypto.randomUUID())
        newGroupId = groupIdMap.get(c.groupId)
      }
      return {
        ...c,
        id: crypto.randomUUID(),
        x: c.x + PASTE_OFFSET,
        y: c.y + PASTE_OFFSET,
        groupId: newGroupId,
        mountedOnRailId: null,
      }
    })
    const pastedIds = new Set(pasted.map((c) => c.id))

    setPlacedComponents((prev) => {
      const working = [...prev, ...pasted]
      return working.map((c) => {
        if (!pastedIds.has(c.id) || c.isRail) return c
        const bounds = getBounds(c)
        const rail = working.find((other) => other.isRail && rectsOverlap(bounds, getBounds(other)))
        return { ...c, mountedOnRailId: rail?.id ?? null }
      })
    })

    setSelectedIds(pastedIds)
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
    placeMultiple,
    repeatLastPlacement,
    lastPlacement,
    moveGroup,
    moveComponentBy,
    getMovableGroupIds,
    select,
    selectByIds,
    clearSelection,
    deleteSelected,
    rotateSelected,
    groupSelected,
    ungroupSelected,
    toggleLock,
    copySelected,
    pasteClipboard,
    hasClipboard: Boolean(clipboard && clipboard.length > 0),
    undo,
    canUndo: history.length > 0,
  }
}
