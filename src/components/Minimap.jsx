import { getEffectiveSize } from '../lib/geometry'

const MAX_SIZE = 160

export default function Minimap({
  placedComponents,
  panelWidth,
  panelHeight,
  scale,
  scrollPos,
  viewportWidth,
  viewportHeight,
}) {
  const mapScale = Math.min(MAX_SIZE / panelWidth, MAX_SIZE / panelHeight)
  const mapWidth = panelWidth * mapScale
  const mapHeight = panelHeight * mapScale

  const viewLeft = Math.max(0, scrollPos.left / scale)
  const viewTop = Math.max(0, scrollPos.top / scale)
  const viewWidth = Math.min(panelWidth - viewLeft, viewportWidth / scale)
  const viewHeight = Math.min(panelHeight - viewTop, viewportHeight / scale)

  return (
    <div className="pointer-events-none absolute right-3 bottom-3 rounded border border-neutral-600 bg-neutral-900/90 p-2 shadow-lg">
      <div className="relative border border-neutral-500 bg-neutral-800" style={{ width: mapWidth, height: mapHeight }}>
        {placedComponents.map((c) => {
          const { width, height } = getEffectiveSize(c)
          return (
            <div
              key={c.id}
              className="absolute"
              style={{
                left: c.x * mapScale,
                top: c.y * mapScale,
                width: Math.max(1, width * mapScale),
                height: Math.max(1, height * mapScale),
                backgroundColor: c.color,
              }}
            />
          )
        })}

        <div
          className="absolute border-2 border-blue-400 bg-blue-400/10"
          style={{
            left: viewLeft * mapScale,
            top: viewTop * mapScale,
            width: Math.max(2, viewWidth * mapScale),
            height: Math.max(2, viewHeight * mapScale),
          }}
        />
      </div>
    </div>
  )
}
