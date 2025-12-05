import { describe, expect, it } from 'vitest'
import { resolve as resolvePath } from '@/utils/path'
import { File, fromText, type Files } from './common/file'
import { Animation } from './animation'
import { Costume } from './costume'
import { Sprite } from './sprite'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeSprite() {
  const sprite = new Sprite('MySprite')
  const costume = new Costume('default', mockFile())
  sprite.addCostume(costume)
  const animationCostumes = Array.from({ length: 3 }, (_, i) => new Costume(`a${i}`, mockFile()))
  const animation = Animation.create('default', animationCostumes)
  sprite.addAnimation(animation)
  return { sprite, costume }
}

describe('Costume', () => {
  it('should clone correctly', () => {
    const { sprite, costume } = makeSprite()

    const clone = costume.clone()
    expect(clone.id).not.toEqual(costume.id)
    expect(clone.name).toEqual(costume.name)
    expect(clone.img).toEqual(costume.img)
    expect(clone.pivot).toEqual(costume.pivot)
    expect(clone.faceRight).toEqual(costume.faceRight)
    expect(clone.bitmapResolution).toEqual(costume.bitmapResolution)

    sprite.addCostume(clone)
    expect(clone.parent).toEqual(sprite)
  })

  it('should populate file metadata size when loading with image dimensions', () => {
    const basePath = '/assets'
    const assetPath = 'sprites/costume.png'
    const file = new File('costume.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {}
    })
    expect(file.meta.imgSize).toBeUndefined()
    const files: Files = {
      [resolvePath(basePath, assetPath)]: file
    }

    const costume = Costume.load(
      {
        name: 'CostumeA',
        path: assetPath,
        bitmapResolution: 2,
        imageWidth: 200,
        imageHeight: 300
      },
      files,
      { basePath, includeId: false }
    )

    expect(costume.img.meta.imgSize).toEqual({ width: 200, height: 300 })
    expect(file.meta.imgSize).toEqual({ width: 200, height: 300 })
  })

  it('should include metadata image size when exporting', () => {
    const file = new File('sprite.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {
        imgSize: {
          width: 320,
          height: 240
        }
      }
    })
    const costume = new Costume('CostumeB', file, {
      id: 'costume-id',
      bitmapResolution: 2,
      pivot: { x: 5, y: 10 },
      faceRight: 1
    })

    const [config] = costume.export({ basePath: '/assets', includeId: true })

    expect(config.imageWidth).toEqual(320)
    expect(config.imageHeight).toEqual(240)
  })
})
