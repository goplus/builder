import { getContentBoundingRect } from '@/utils/img'
import { toNativeFile } from '@/models/common/file'
import { CollisionShapeType, type Sprite } from '@/models/spx/sprite'
import type { Pivot } from '@/models/spx/costume'

export type ColliderBounds = { x: number; y: number; width: number; height: number }

type ColliderGeometry = {
  /** Collider bounds; null when the shape is None. */
  bounds: ColliderBounds | null
  /** Polygon vertices in costume coordinates; empty for other shapes. */
  polygonPoints: number[]
}

/** Reads collider geometry in costume units (after bitmapResolution), with screen y pointing down. */
export async function getColliderGeometry(sprite: Sprite): Promise<ColliderGeometry> {
  const costume = sprite.defaultCostume
  if (costume == null) throw new Error('Sprite has no default costume')
  const pivot = costume.pivot
  const [a, b] = sprite.collisionShapeParams
  let width: number
  let height: number
  switch (sprite.collisionShapeType) {
    case CollisionShapeType.Auto: {
      const { img, bitmapResolution } = costume
      const rect = await getContentBoundingRect(await toNativeFile(img))
      return {
        bounds: {
          x: rect.x / bitmapResolution,
          y: rect.y / bitmapResolution,
          width: rect.width / bitmapResolution,
          height: rect.height / bitmapResolution
        },
        polygonPoints: []
      }
    }
    case CollisionShapeType.Circle:
      width = height = a * 2
      break
    case CollisionShapeType.Rect:
      width = a
      height = b
      break
    case CollisionShapeType.Capsule:
      // SPX sets Godot's radius before height; height may reduce the radius.
      width = Math.min(a * 2, b)
      height = b
      break
    case CollisionShapeType.Polygon: {
      const points = sprite.collisionShapeParams.map((value, i) =>
        i % 2 === 0 ? pivot.x + sprite.collisionPivot.x + value : pivot.y - sprite.collisionPivot.y - value
      )
      const xs = points.filter((_, i) => i % 2 === 0)
      const ys = points.filter((_, i) => i % 2 === 1)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      return { bounds: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }, polygonPoints: points }
    }
    default:
      return { bounds: null, polygonPoints: [] }
  }
  return {
    bounds: {
      x: pivot.x + sprite.collisionPivot.x - width / 2,
      y: pivot.y - sprite.collisionPivot.y - height / 2,
      width,
      height
    },
    polygonPoints: []
  }
}

const shapeSetters: Partial<Record<CollisionShapeType, (sprite: Sprite, bounds: ColliderBounds) => void>> = {
  [CollisionShapeType.Auto]: (sprite, bounds) => sprite.setCollisionShapeRect(bounds.width, bounds.height),
  [CollisionShapeType.Rect]: (sprite, bounds) => sprite.setCollisionShapeRect(bounds.width, bounds.height),
  [CollisionShapeType.Circle]: (sprite, bounds) => sprite.setCollisionShapeCircle(bounds.width / 2),
  [CollisionShapeType.Capsule]: (sprite, bounds) => sprite.setCollisionShapeCapsule(bounds.width / 2, bounds.height)
}

/** Whether a shape can be edited by changing its bounds. */
export function isColliderEditable(type: CollisionShapeType) {
  return shapeSetters[type] != null
}

/** A null edited bounds preserves the configured shape, including Auto and None. */
export function applyPivotCollisionEdit(sprite: Sprite, newPivot: Pivot, editedBounds: ColliderBounds | null) {
  const costume = sprite.defaultCostume
  if (costume == null) throw new Error('Sprite has no default costume')
  const delta = { x: newPivot.x - costume.pivot.x, y: newPivot.y - costume.pivot.y }
  if (editedBounds != null) {
    const setShape = shapeSetters[sprite.collisionShapeType]
    if (setShape == null) throw new Error(`Collision shape ${sprite.collisionShapeType} is not editable`)
    sprite.applyCostumesPivotChange(delta)
    sprite.setCollisionPivot({
      x: editedBounds.x + editedBounds.width / 2 - newPivot.x,
      y: newPivot.y - editedBounds.y - editedBounds.height / 2
    })
    setShape(sprite, editedBounds)
    return
  }
  sprite.applyCostumesPivotChange(delta)
  // Keep the collider aligned with the artwork, including Auto shapes with a stored collisionPivot.
  if (sprite.collisionShapeType !== CollisionShapeType.None) {
    sprite.setCollisionPivot({ x: sprite.collisionPivot.x - delta.x, y: sprite.collisionPivot.y + delta.y })
  }
}
