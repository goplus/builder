import { describe, expect, it } from 'vitest'
import { resolve as resolvePath } from '@/utils/path'
import { File, fromText, type Files } from '../common/file'
import { Stage } from './stage'
import { Backdrop } from './backdrop'

function mockFile(name = 'mocked') {
  return fromText(name, Math.random() + '')
}

function makeStage() {
  const stage = new Stage('')
  const backdrop = new Backdrop('default', mockFile())
  stage.addBackdrop(backdrop)
  return stage
}

describe('Backdrop', () => {
  it('should clone correctly', () => {
    const stage = makeStage()
    const backdrop = stage.backdrops[0]
    backdrop.setPivot({ x: 12, y: 34 })

    const clone = backdrop.clone()
    expect(clone.id).not.toEqual(backdrop.id)
    expect(clone.name).toEqual(backdrop.name)
    expect(clone.img).toEqual(backdrop.img)
    expect(clone.pivot).toEqual(backdrop.pivot)
    expect(clone.bitmapResolution).toEqual(backdrop.bitmapResolution)

    stage.addBackdrop(clone)
    expect(clone.stage).toEqual(stage)
  })

  it('should populate file metadata size when loading with image dimensions', async () => {
    const assetPath = 'backgrounds/backdrop.png'
    const file = new File('backdrop.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {}
    })
    expect(file.meta.imgSize).toBeUndefined()
    const files: Files = {
      [resolvePath('assets', assetPath)]: file
    }

    const backdrop = await Backdrop.load(
      {
        name: 'BackdropA',
        path: assetPath,
        x: 100,
        y: 50,
        bitmapResolution: 2,
        imageWidth: 400,
        imageHeight: 300
      },
      files,
      { includeId: false }
    )

    expect(backdrop.pivot).toEqual({ x: 50, y: 25 })
    expect(backdrop.img.meta.imgSize).toEqual({ width: 400, height: 300 })
    expect(file.meta.imgSize).toEqual({ width: 400, height: 300 })
  })

  it('should default pivot to image center when loading without x and y', async () => {
    const assetPath = 'backgrounds/backdrop.png'
    const file = new File('backdrop.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {
        imgSize: {
          width: 400,
          height: 300
        }
      }
    })
    const files: Files = {
      [resolvePath('assets', assetPath)]: file
    }

    const backdrop = await Backdrop.load(
      {
        name: 'BackdropA',
        path: assetPath,
        bitmapResolution: 2
      },
      files,
      { includeId: false }
    )

    expect(backdrop.pivot).toEqual({ x: 100, y: 75 })

    const [config] = backdrop.export({ includeId: false })
    expect(config.x).toBe(200)
    expect(config.y).toBe(150)
  })

  it('should ignore legacy meaningless x and y when faceRight is present', async () => {
    const assetPath = 'backgrounds/backdrop.png'
    const file = new File('backdrop.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {
        imgSize: {
          width: 400,
          height: 300
        }
      }
    })
    const files: Files = {
      [resolvePath('assets', assetPath)]: file
    }

    const backdrop = await Backdrop.load(
      {
        name: 'BackdropA',
        path: assetPath,
        x: 0,
        y: 0,
        faceRight: 90,
        bitmapResolution: 2
      },
      files,
      { includeId: false }
    )

    expect(backdrop.pivot).toEqual({ x: 100, y: 75 })
  })

  it('should get raw size from image metadata', async () => {
    const file = new File('stage.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {
        imgSize: {
          width: 512,
          height: 288
        }
      }
    })
    const backdrop = new Backdrop('BackdropRawSize', file)

    const rawSize = await backdrop.getRawSize()

    expect(rawSize).toEqual({ width: 512, height: 288 })
  })

  it('should get size divided by bitmap resolution', async () => {
    const file = new File('stage.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {
        imgSize: {
          width: 512,
          height: 288
        }
      }
    })
    const backdrop = new Backdrop('BackdropSize', file, {
      bitmapResolution: 2
    })

    const size = await backdrop.getSize()

    expect(size).toEqual({ width: 256, height: 144 })
  })

  it('should default create pivot to image center', async () => {
    const file = new File('stage.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {
        imgSize: {
          width: 512,
          height: 288
        }
      }
    })

    const backdrop = await Backdrop.create('BackdropC', file)

    expect(backdrop.pivot).toEqual({ x: 128, y: 72 })
    expect(backdrop.bitmapResolution).toBe(2)
  })

  it('should include metadata image size when exporting', () => {
    const file = new File('stage.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {
        imgSize: {
          width: 512,
          height: 288
        }
      }
    })
    const backdrop = new Backdrop('BackdropB', file, {
      id: 'backdrop-id',
      pivot: { x: 40, y: 24 },
      bitmapResolution: 2
    })

    const [config] = backdrop.export({ includeId: true })

    expect(config.x).toEqual(80)
    expect(config.y).toEqual(48)
    expect(config.imageWidth).toEqual(512)
    expect(config.imageHeight).toEqual(288)
  })
})
