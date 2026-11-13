import { describe, expect, it } from 'vitest'
import { File, fromText } from '@/models/common/file'
import { Costume } from '@/models/spx/costume'
import { CollisionShapeType, RotationStyle, Sprite } from '@/models/spx/sprite'
import {
  applyPivotCollisionEdit,
  getColliderBounds,
  getColliderPolygonPoints,
  getColliderPreviewTransform
} from './collider'

function makeSprite(type: CollisionShapeType, params: number[]) {
  const sprite = new Sprite('Test', '', {
    size: 2,
    heading: 135,
    collisionShapeType: type,
    collisionShapeParams: params,
    collisionPivot: { x: 3, y: 5 }
  })
  const costume = new Costume('test', fromText('test.svg', '<svg width="200" height="150"/>'), {
    pivot: { x: 25, y: 18.75 },
    bitmapResolution: 4
  })
  sprite.addCostume(costume)
  return sprite
}

describe('physical collider geometry', () => {
  it('loads raw costume anchors and bitmap resolution before positioning a collider', async () => {
    const file = new File('body.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: { imgSize: { width: 240, height: 200 } }
    })
    const costume = Costume.load(
      { name: 'body', path: 'body.png', x: 100, y: 75, bitmapResolution: 4 },
      { '/body.png': file },
      { basePath: '', includeId: false }
    )
    const sprite = new Sprite('Loaded', '', {
      size: 2,
      collisionShapeType: CollisionShapeType.Circle,
      collisionShapeParams: [10]
    })
    sprite.addCostume(costume)
    expect(costume.pivot).toEqual({ x: 25, y: 18.75 })
    expect(await costume.getSize()).toEqual({ width: 60, height: 50 })
    expect(getColliderBounds(sprite, costume.pivot)).toEqual({ x: 15, y: 8.75, width: 20, height: 20 })
  })

  it('uses costume units for a circle, with size applied only in the world preview', () => {
    const sprite = makeSprite(CollisionShapeType.Circle, [10])
    sprite.setCollisionPivot({ x: 0, y: 0 })
    const bounds = getColliderBounds(sprite, sprite.defaultCostume!.pivot)!
    expect(bounds).toEqual({ x: 15, y: 8.75, width: 20, height: 20 })
    expect(bounds.width * getColliderPreviewTransform(sprite, 0).scaleX).toBe(40)
  })

  it.each([
    [CollisionShapeType.Rect, [20, 30], { x: 18, y: -1.25, width: 20, height: 30 }],
    [CollisionShapeType.Capsule, [4, 20], { x: 24, y: 3.75, width: 8, height: 20 }],
    [CollisionShapeType.Capsule, [20, 10], { x: 23, y: 8.75, width: 10, height: 10 }]
  ] as const)('previews %s with parameters %j', (type, params, expected) => {
    const sprite = makeSprite(type, [...params])
    expect(getColliderBounds(sprite, sprite.defaultCostume!.pivot)).toEqual(expected)
  })

  it('converts polygon vertices and collision pivot from y-up into costume coordinates', () => {
    const sprite = makeSprite(CollisionShapeType.Polygon, [-10, -5, 10, -5, 0, 15])
    expect(getColliderPolygonPoints(sprite, sprite.defaultCostume!.pivot)).toEqual([18, 18.75, 38, 18.75, 28, -1.25])
    expect(getColliderBounds(sprite, sprite.defaultCostume!.pivot)).toEqual({ x: 18, y: -1.25, width: 20, height: 20 })
  })

  it.each([
    [RotationStyle.Normal, 135, 15, { rotation: 60, scaleX: 2, scaleY: 2 }],
    [RotationStyle.None, 135, 15, { rotation: 0, scaleX: 2, scaleY: 2 }],
    [RotationStyle.LeftRight, -45, 15, { rotation: 0, scaleX: -2, scaleY: 2 }],
    [RotationStyle.LeftRight, 315, 15, { rotation: 0, scaleX: 2, scaleY: 2 }],
    [RotationStyle.LeftRight, 45, 15, { rotation: 0, scaleX: 2, scaleY: 2 }]
  ])('applies %s heading=%s faceRight=%s', (style, heading, faceRight, expected) => {
    const sprite = makeSprite(CollisionShapeType.Circle, [10])
    sprite.setRotationStyle(style)
    sprite.setHeading(heading)
    expect(getColliderPreviewTransform(sprite, faceRight)).toEqual(expected)
  })
})

describe('saving pivot and collider edits', () => {
  it('preserves separate trigger configuration on physical collider edits', async () => {
    const sprite = makeSprite(CollisionShapeType.Circle, [10])
    const trigger = {
      triggerShapeType: 'polygon',
      triggerShapeParams: [-30, -20, 30, -20, 0, 30],
      triggerPivot: { x: 8, y: -7 },
      triggerLayer: 2,
      triggerMask: 4
    }
    sprite.setExtraConfig(trigger)
    applyPivotCollisionEdit(sprite, { x: 30, y: 20 }, { x: 20, y: 15, width: 30, height: 30 })
    const [loaded] = await Sprite.loadAll(sprite.export({ sounds: [] }), { sounds: [] })
    expect(loaded.extraConfig).toMatchObject(trigger)
  })

  it.each([
    [CollisionShapeType.Circle, [10]],
    [CollisionShapeType.Rect, [20, 30]],
    [CollisionShapeType.Capsule, [4, 20]],
    [CollisionShapeType.Polygon, [-10, -5, 10, -5, 0, 15]],
    [CollisionShapeType.Auto, []],
    [CollisionShapeType.None, []]
  ])('preserves %s parameters when only the pivot moves, including export/load', async (type, params) => {
    const sprite = makeSprite(type, params)
    const bounds = getColliderBounds(sprite, sprite.defaultCostume!.pivot)
    const points = getColliderPolygonPoints(sprite, sprite.defaultCostume!.pivot)
    applyPivotCollisionEdit(sprite, { x: 30, y: 20.75 }, null)
    const [loaded] = await Sprite.loadAll(sprite.export({ sounds: [] }), { sounds: [] })
    expect(loaded.collisionShapeType).toBe(type)
    expect(loaded.collisionShapeParams).toEqual(params)
    expect(loaded.defaultCostume!.pivot).toEqual({ x: 30, y: 20.75 })
    expect(loaded.collisionPivot).toEqual(type === CollisionShapeType.None ? { x: 3, y: 5 } : { x: -2, y: 7 })
    if (type !== CollisionShapeType.None) {
      expect(getColliderBounds(loaded, loaded.defaultCostume!.pivot)).toEqual(bounds)
    }
    if (type === CollisionShapeType.Polygon) {
      expect(getColliderPolygonPoints(loaded, loaded.defaultCostume!.pivot)).toEqual(points)
    }
  })

  it('edits circle center and radius without changing its type', () => {
    const sprite = makeSprite(CollisionShapeType.Circle, [10])
    applyPivotCollisionEdit(sprite, { x: 30, y: 20 }, { x: 20, y: 15, width: 30, height: 30 })
    expect(sprite.collisionShapeType).toBe(CollisionShapeType.Circle)
    expect(sprite.collisionShapeParams).toEqual([15])
    expect(sprite.collisionPivot).toEqual({ x: 5, y: -10 })
  })

  it.each([CollisionShapeType.Rect, CollisionShapeType.Auto])(
    'saves an explicitly edited %s as a rectangle',
    (type) => {
      const sprite = makeSprite(type, type === CollisionShapeType.Rect ? [20, 30] : [])
      applyPivotCollisionEdit(sprite, { x: 30, y: 20 }, { x: 20, y: 15, width: 40, height: 30 })
      expect(sprite.collisionShapeType).toBe(CollisionShapeType.Rect)
      expect(sprite.collisionShapeParams).toEqual([40, 30])
      expect(sprite.collisionPivot).toEqual({ x: 10, y: -10 })
    }
  )
})
