import { describe, expect, it, vi } from 'vitest'
import { File, fromText } from '@/models/common/file'
import { Costume } from '@/models/spx/costume'
import { CollisionShapeType, Sprite } from '@/models/spx/sprite'
import { applyPivotCollisionEdit, getColliderGeometry, isColliderEditable } from './collider'

vi.mock('@/utils/img', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getContentBoundingRect: vi.fn(async () => ({ x: 20, y: 12, width: 120, height: 80 }))
}))

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
    expect((await getColliderGeometry(sprite)).bounds).toEqual({ x: 15, y: 8.75, width: 20, height: 20 })
  })

  it('uses costume units for a circle before sprite scaling', async () => {
    const sprite = makeSprite(CollisionShapeType.Circle, [10])
    sprite.setCollisionPivot({ x: 0, y: 0 })
    const { bounds } = await getColliderGeometry(sprite)
    expect(bounds).toEqual({ x: 15, y: 8.75, width: 20, height: 20 })
    expect(bounds!.width * sprite.size).toBe(40)
  })

  it.each([
    [CollisionShapeType.Rect, [20, 30], { x: 18, y: -1.25, width: 20, height: 30 }],
    [CollisionShapeType.Capsule, [4, 20], { x: 24, y: 3.75, width: 8, height: 20 }],
    [CollisionShapeType.Capsule, [20, 10], { x: 23, y: 8.75, width: 10, height: 10 }]
  ] as const)('previews %s with parameters %j', async (type, params, expected) => {
    const sprite = makeSprite(type, [...params])
    expect((await getColliderGeometry(sprite)).bounds).toEqual(expected)
  })

  it('reads automatic image bounds and converts bitmap pixels into costume units', async () => {
    const sprite = makeSprite(CollisionShapeType.Auto, [])
    expect(await getColliderGeometry(sprite)).toEqual({
      bounds: { x: 5, y: 3, width: 30, height: 20 },
      polygonPoints: []
    })
  })

  it('returns no geometry for a sprite without a collider', async () => {
    const sprite = makeSprite(CollisionShapeType.None, [])
    expect(await getColliderGeometry(sprite)).toEqual({ bounds: null, polygonPoints: [] })
  })

  it('converts polygon vertices and collision pivot from y-up into costume coordinates', async () => {
    const sprite = makeSprite(CollisionShapeType.Polygon, [-10, -5, 10, -5, 0, 15])
    expect(await getColliderGeometry(sprite)).toEqual({
      bounds: { x: 18, y: -1.25, width: 20, height: 20 },
      polygonPoints: [18, 18.75, 38, 18.75, 28, -1.25]
    })
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
    const geometry = await getColliderGeometry(sprite)
    applyPivotCollisionEdit(sprite, { x: 30, y: 20.75 }, null)
    const [loaded] = await Sprite.loadAll(sprite.export({ sounds: [] }), { sounds: [] })
    expect(loaded.collisionShapeType).toBe(type)
    expect(loaded.collisionShapeParams).toEqual(params)
    expect(loaded.defaultCostume!.pivot).toEqual({ x: 30, y: 20.75 })
    expect(loaded.collisionPivot).toEqual(type === CollisionShapeType.None ? { x: 3, y: 5 } : { x: -2, y: 7 })
    expect(await getColliderGeometry(loaded)).toEqual(geometry)
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

describe('collider bounds editing', () => {
  it.each([
    [CollisionShapeType.Auto, true],
    [CollisionShapeType.Rect, true],
    [CollisionShapeType.Circle, true],
    [CollisionShapeType.Capsule, true],
    [CollisionShapeType.Polygon, false],
    [CollisionShapeType.None, false]
  ])('reports editing support for %s', (type, editable) => {
    expect(isColliderEditable(type)).toBe(editable)
  })

  it('saves capsule center, radius and total height through export/load', async () => {
    const sprite = makeSprite(CollisionShapeType.Capsule, [4, 20])
    applyPivotCollisionEdit(sprite, { x: 30, y: 20 }, { x: 20, y: 15, width: 16, height: 30 })
    const [loaded] = await Sprite.loadAll(sprite.export({ sounds: [] }), { sounds: [] })
    expect(loaded.collisionShapeType).toBe(CollisionShapeType.Capsule)
    expect(loaded.collisionShapeParams).toEqual([8, 30])
    expect(loaded.collisionPivot).toEqual({ x: -2, y: -10 })
    expect((await getColliderGeometry(loaded)).bounds).toEqual({ x: 20, y: 15, width: 16, height: 30 })
  })

  it('rejects polygon bounds edits before changing the model', () => {
    const sprite = makeSprite(CollisionShapeType.Polygon, [-10, -5, 10, -5, 0, 15])
    expect(() => applyPivotCollisionEdit(sprite, { x: 30, y: 20 }, { x: 20, y: 15, width: 40, height: 30 })).toThrow(
      'not editable'
    )
    expect(sprite.defaultCostume!.pivot).toEqual({ x: 25, y: 18.75 })
    expect(sprite.collisionPivot).toEqual({ x: 3, y: 5 })
    expect(sprite.collisionShapeType).toBe(CollisionShapeType.Polygon)
    expect(sprite.collisionShapeParams).toEqual([-10, -5, 10, -5, 0, 15])
  })
})
