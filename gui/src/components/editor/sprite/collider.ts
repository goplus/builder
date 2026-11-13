import { CollisionShapeType, RotationStyle, type Sprite } from '@/models/spx/sprite'
import type { Pivot } from '@/models/spx/costume'

export type ColliderBounds = { x: number; y: number; width: number; height: number }

/** Shape coordinates use costume units (after bitmapResolution), with screen y pointing down. */
export function getColliderBounds(sprite: Sprite, pivot: Pivot): ColliderBounds | null {
  const [a, b] = sprite.collisionShapeParams
  let width: number
  let height: number
  switch (sprite.collisionShapeType) {
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
      const points = getColliderPolygonPoints(sprite, pivot)
      const xs = points.filter((_, i) => i % 2 === 0)
      const ys = points.filter((_, i) => i % 2 === 1)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
    }
    default:
      return null
  }
  return {
    x: pivot.x + sprite.collisionPivot.x - width / 2,
    y: pivot.y - sprite.collisionPivot.y - height / 2,
    width,
    height
  }
}

export function getColliderPolygonPoints(sprite: Sprite, pivot: Pivot): number[] {
  return sprite.collisionShapeParams.map((value, i) =>
    i % 2 === 0 ? pivot.x + sprite.collisionPivot.x + value : pivot.y - sprite.collisionPivot.y - value
  )
}

/** The initial world orientation, matching SPX getRenderRotationAndScale (including faceRight). */
export function getColliderPreviewTransform(sprite: Sprite, faceRight: number) {
  const rotation = sprite.rotationStyle === RotationStyle.Normal ? sprite.heading + faceRight - 90 : 0
  const flip = sprite.rotationStyle === RotationStyle.LeftRight && sprite.heading < 0 ? -1 : 1
  return { rotation, scaleX: sprite.size * flip, scaleY: sprite.size }
}

/** A null edited bounds preserves the configured shape, including Auto and None. */
export function applyPivotCollisionEdit(sprite: Sprite, pivot: Pivot, editedBounds: ColliderBounds | null) {
  const costume = sprite.defaultCostume
  if (costume == null) throw new Error('Sprite has no default costume')
  const delta = { x: pivot.x - costume.pivot.x, y: pivot.y - costume.pivot.y }
  sprite.applyCostumesPivotChange(delta)
  if (editedBounds != null) {
    sprite.setCollisionPivot({
      x: editedBounds.x + editedBounds.width / 2 - pivot.x,
      y: pivot.y - editedBounds.y - editedBounds.height / 2
    })
    if (sprite.collisionShapeType === CollisionShapeType.Circle) {
      sprite.setCollisionShapeCircle(editedBounds.width / 2)
    } else {
      sprite.setCollisionShapeRect(editedBounds.width, editedBounds.height)
    }
  } else if (sprite.collisionShapeType !== CollisionShapeType.None) {
    sprite.setCollisionPivot({ x: sprite.collisionPivot.x - delta.x, y: sprite.collisionPivot.y + delta.y })
  }
}
