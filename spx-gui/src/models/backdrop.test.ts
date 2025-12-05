import { describe, expect, it } from 'vitest'
import { resolve as resolvePath } from '@/utils/path'
import { File, fromText, type Files } from './common/file'
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

    const clone = backdrop.clone()
    expect(clone.id).not.toEqual(backdrop.id)
    expect(clone.name).toEqual(backdrop.name)
    expect(clone.img).toEqual(backdrop.img)
    expect(clone.bitmapResolution).toEqual(backdrop.bitmapResolution)

    stage.addBackdrop(clone)
    expect(clone.stage).toEqual(stage)
  })

  it('should populate file metadata size when loading with image dimensions', () => {
    const assetPath = 'backgrounds/backdrop.png'
    const file = new File('backdrop.png', async () => new ArrayBuffer(0), {
      type: 'image/png',
      meta: {}
    })
    expect(file.meta.imgSize).toBeUndefined()
    const files: Files = {
      [resolvePath('assets', assetPath)]: file
    }

    const backdrop = Backdrop.load(
      {
        name: 'BackdropA',
        path: assetPath,
        bitmapResolution: 2,
        imageWidth: 400,
        imageHeight: 300
      },
      files,
      { includeId: false }
    )

    expect(backdrop.img.meta.imgSize).toEqual({ width: 400, height: 300 })
    expect(file.meta.imgSize).toEqual({ width: 400, height: 300 })
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
      bitmapResolution: 2
    })

    const [config] = backdrop.export({ includeId: true })

    expect(config.imageWidth).toEqual(512)
    expect(config.imageHeight).toEqual(288)
  })
})
