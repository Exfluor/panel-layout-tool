import { useMemo, useState } from 'react'
import { getBounds, getEffectiveSize, rectsOverlap } from '../lib/geometry'

const MAX_HISTORY = 5

export function usePanelLayout(initialComponents = [], panelWidth = 0, panelHeight = 0) {
  const [placedComponents, setPlacedComponentsRaw] = useState(initialComponents)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  // The most recently added-to-selection component — the fixed reference
  // point when centering a multi-selection, and (with exactly two selected)
  // which one stays put when editing the gap distance between them.
  const [anchorId, setAnchorId] = useState(null)
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
  // repeatLastPlacement can continue it. The starting point is clamped so
  // the whole row stays inside the panel — repeatLastPlacement in
  // particular just continues from wherever the last row ended, with
  // nothing else re-checking that that's still in-bounds.
  function placeMultiple(component, x, y, quantity = 1) {
    const count = Math.max(1, Math.floor(quantity))
    const isRail = component.isRail ?? false
    const ids = Array.from({ length: count }, () => crypto.randomUUID())
    const rowWidth = count * component.width
    const clampedX = panelWidth > 0 ? Math.min(Math.max(x, 0), Math.max(0, panelWidth - rowWidth)) : x
    const clampedY = panelHeight > 0 ? Math.min(Math.max(y, 0), Math.max(0, panelHeight - component.height)) : y

    setPlacedComponents((prev) => {
      let working = prev
      for (let i = 0; i < count; i++) {
        const newComponent = {
          id: ids[i],
          libraryComponentId: component.id ?? null,
          name: component.name,
          partNumber: component.partNumber ?? '',
          resizable: component.resizable ?? false,
          resizableAxis: component.resizableAxis === 'height' ? 'height' : 'width',
          width: component.width,
          height: component.height,
          color: component.color,
          isRail,
          x: clampedX + i * component.width,
          y: clampedY,
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
    setLastPlacement({ component, nextX: clampedX + count * component.width, y: clampedY, quantity: count })
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

  // Pushes an edited library component's non-dimension fields out to every
  // already-placed instance of it (matched via libraryComponentId, set when
  // each one was placed). Width/height are deliberately excluded — resizing
  // every existing placement whenever the library entry's size changes would
  // be surprising and could silently break a layout; placing a fresh copy is
  // how a dimension change is meant to take effect. Placements made before
  // this tracking existed have no libraryComponentId and won't retroactively
  // link up.
  function syncFromLibrary(libraryComponentId, updates) {
    const { name, partNumber, color, isRail, resizable, resizableAxis } = updates
    const patch = {}
    if (name !== undefined) patch.name = name
    if (partNumber !== undefined) patch.partNumber = partNumber
    if (color !== undefined) patch.color = color
    if (isRail !== undefined) patch.isRail = isRail
    if (resizable !== undefined) patch.resizable = resizable
    if (resizableAxis !== undefined) patch.resizableAxis = resizableAxis
    if (Object.keys(patch).length === 0) return
    if (!placedComponents.some((c) => c.libraryComponentId === libraryComponentId)) return

    setLastPlacement(null)
    setPlacedComponents((prev) =>
      prev.map((c) => (c.libraryComponentId === libraryComponentId ? { ...c, ...patch } : c)),
    )
  }

  // Moves the given components, then re-checks rail mounting for whichever of
  // them aren't rails themselves — a part that's dragged onto a rail mounts on
  // it automatically, and one dragged away detaches, without any manual grouping.
  function moveGroup(ids, deltaX, deltaY) {
    if (deltaX === 0 && deltaY === 0) return
    setLastPlacement(null)
    setPlacedComponents((prev) => {
      // Clamp the delta against the whole group's combined bounding box, not
      // just whichever member the caller measured from — a member positioned
      // further toward an edge than the reference point must not be allowed
      // to cross the panel wall even if the reference point itself stays in
      // bounds.
      let clampedDeltaX = deltaX
      let clampedDeltaY = deltaY
      if (panelWidth > 0 && panelHeight > 0) {
        const groupBounds = prev.filter((c) => ids.includes(c.id)).map(getBounds)
        if (groupBounds.length > 0) {
          const groupX1 = Math.min(...groupBounds.map((b) => b.x))
          const groupY1 = Math.min(...groupBounds.map((b) => b.y))
          const groupX2 = Math.max(...groupBounds.map((b) => b.x + b.width))
          const groupY2 = Math.max(...groupBounds.map((b) => b.y + b.height))
          if (groupX1 + clampedDeltaX < 0) clampedDeltaX = -groupX1
          if (groupX2 + clampedDeltaX > panelWidth) clampedDeltaX = panelWidth - groupX2
          if (groupY1 + clampedDeltaY < 0) clampedDeltaY = -groupY1
          if (groupY2 + clampedDeltaY > panelHeight) clampedDeltaY = panelHeight - groupY2
        }
      }
      const moved = prev.map((c) =>
        ids.includes(c.id) ? { ...c, x: c.x + clampedDeltaX, y: c.y + clampedDeltaY } : c
      )
      return moved.map((c) => {
        if (!ids.includes(c.id) || c.isRail) return c
        const bounds = getBounds(c)
        const rail = moved.find((other) => other.isRail && rectsOverlap(bounds, getBounds(other)))
        return { ...c, mountedOnRailId: rail?.id ?? null }
      })
    })
  }

  // Lines up the selected components' vertical centers (same row height),
  // leaving their left/right position untouched. The last component added to
  // the selection stays put as the reference; everything else moves to match
  // its center. Falls back to the average center if that anchor isn't
  // (any longer) part of the selection.
  function centerSelectedHorizontally() {
    if (selectedIds.size < 2) return
    setLastPlacement(null)

    const selected = placedComponents.filter((c) => selectedIds.has(c.id))
    const anchor = selected.find((c) => c.id === anchorId)
    const targetCenter = anchor
      ? anchor.y + getEffectiveSize(anchor).height / 2
      : selected.reduce((sum, c) => sum + c.y + getEffectiveSize(c).height / 2, 0) / selected.length

    setPlacedComponents((prev) => {
      const moved = prev.map((c) => {
        if (!selectedIds.has(c.id) || c.locked) return c
        return { ...c, y: targetCenter - getEffectiveSize(c).height / 2 }
      })
      return moved.map((c) => {
        if (!selectedIds.has(c.id) || c.locked || c.isRail) return c
        const bounds = getBounds(c)
        const rail = moved.find((other) => other.isRail && rectsOverlap(bounds, getBounds(other)))
        return { ...c, mountedOnRailId: rail?.id ?? null }
      })
    })
  }

  // Slides the selected (unlocked) components flush against each other,
  // left-to-right in their current order, closing any gaps between them
  // without changing their vertical position. The leftmost one stays put.
  function packSelectedHorizontally() {
    setLastPlacement(null)

    const selected = placedComponents
      .filter((c) => selectedIds.has(c.id) && !c.locked)
      .map((c) => ({ id: c.id, x: getBounds(c).x, width: getEffectiveSize(c).width }))
      .sort((a, b) => a.x - b.x)
    if (selected.length < 2) return

    const targetX = new Map()
    let cursor = selected[0].x
    selected.forEach((c) => {
      targetX.set(c.id, cursor)
      cursor += c.width
    })

    setPlacedComponents((prev) => {
      const moved = prev.map((c) => (targetX.has(c.id) ? { ...c, x: targetX.get(c.id) } : c))
      return moved.map((c) => {
        if (!targetX.has(c.id) || c.isRail) return c
        const bounds = getBounds(c)
        const rail = moved.find((other) => other.isRail && rectsOverlap(bounds, getBounds(other)))
        return { ...c, mountedOnRailId: rail?.id ?? null }
      })
    })
  }

  // Applies a resize-handle drag: `effectiveRect` is the new on-screen
  // (post-rotation) box for the component — converted back to its raw
  // width/height (which swap with height/width at 90°/270°) — then rail
  // mounting is re-checked since stretching a part can newly overlap or
  // clear a rail underneath it.
  function resizeComponent(id, effectiveRect) {
    const primary = placedComponents.find((c) => c.id === id)
    if (!primary || primary.locked) return
    setLastPlacement(null)

    // Rounded to the thousandth of an inch — drag/snap math can otherwise
    // leave floating-point noise (e.g. 22.700000000000003) baked into the
    // stored size, which then shows up verbatim in the parts list and BOM.
    const round3 = (v) => Math.round(v * 1000) / 1000

    setPlacedComponents((prev) => {
      const moved = prev.map((c) => {
        if (c.id !== id) return c
        const rotated = c.rotation % 180 !== 0
        const width = round3(rotated ? effectiveRect.height : effectiveRect.width)
        const height = round3(rotated ? effectiveRect.width : effectiveRect.height)
        return { ...c, x: round3(effectiveRect.x), y: round3(effectiveRect.y), width, height }
      })
      return moved.map((c) => {
        if (c.id !== id || c.isRail) return c
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
    setAnchorId(ids.length > 0 ? ids[ids.length - 1] : null)
  }

  function select(id, { additive = false } = {}) {
    const target = placedComponents.find((c) => c.id === id)
    if (!target) return
    setLastPlacement(null)

    const groupIds = target.groupId
      ? placedComponents.filter((c) => c.groupId === target.groupId).map((c) => c.id)
      : [id]

    if (additive) {
      const allSelected = groupIds.every((gid) => selectedIds.has(gid))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        groupIds.forEach((gid) => (allSelected ? next.delete(gid) : next.add(gid)))
        return next
      })
      setAnchorId(allSelected ? null : id)
    } else {
      setSelectedIds(new Set(groupIds))
      setAnchorId(id)
    }
  }

  function clearSelection() {
    setLastPlacement(null)
    setSelectedIds(new Set())
    setAnchorId(null)
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

    // The paste offset is clamped to the clipboard's own combined bounding
    // box, not applied blindly — copying something already near an edge
    // would otherwise offset it straight past that edge with nothing to
    // pull it back in.
    const boundsList = clipboard.map(getBounds)
    const x1 = Math.min(...boundsList.map((b) => b.x))
    const y1 = Math.min(...boundsList.map((b) => b.y))
    const x2 = Math.max(...boundsList.map((b) => b.x + b.width))
    const y2 = Math.max(...boundsList.map((b) => b.y + b.height))
    const clampedX1 =
      panelWidth > 0 ? Math.min(Math.max(x1 + PASTE_OFFSET, 0), Math.max(0, panelWidth - (x2 - x1))) : x1 + PASTE_OFFSET
    const clampedY1 =
      panelHeight > 0 ? Math.min(Math.max(y1 + PASTE_OFFSET, 0), Math.max(0, panelHeight - (y2 - y1))) : y1 + PASTE_OFFSET
    const offsetX = clampedX1 - x1
    const offsetY = clampedY1 - y1

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
        x: c.x + offsetX,
        y: c.y + offsetY,
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
    resizeComponent,
    syncFromLibrary,
    anchorId,
    select,
    selectByIds,
    clearSelection,
    deleteSelected,
    rotateSelected,
    groupSelected,
    ungroupSelected,
    centerSelectedHorizontally,
    packSelectedHorizontally,
    toggleLock,
    copySelected,
    pasteClipboard,
    hasClipboard: Boolean(clipboard && clipboard.length > 0),
    undo,
    canUndo: history.length > 0,
  }
}
