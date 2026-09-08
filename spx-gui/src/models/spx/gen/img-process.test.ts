import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupAigcMock } from './aigc-mock' // Keep before `@/apis/aigc` so its mock is installed first
import { TaskType } from '@/apis/aigc'
import * as canvasUtils from '@/utils/canvas'
import * as cloudHelpers from '@/models/common/cloud'
import { mockFile } from '../../common/test'
import { fitImageToCanvasWithContrastBg, prepareAnimationReferenceImage } from './img-process'

const aigcMock = setupAigcMock()

function mockImage(width: number, height: number) {
  class MockImage {
    naturalWidth = width
    naturalHeight = height
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    crossOrigin = ''
    alt = ''

    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', MockImage)
}

function mockCanvas(imageData: Uint8ClampedArray) {
  const ctx = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low' as ImageSmoothingQuality,
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: imageData }),
    fillRect: vi.fn(),
    fillStyle: ''
  }
  vi.spyOn(canvasUtils, 'getImgDrawingCtx').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D & OffscreenCanvasRenderingContext2D
  )
  return ctx
}

describe('img-process', () => {
  beforeEach(() => {
    aigcMock.reset()
    cloudHelpers.cloudHelpers.setConfig({
      baseUrl: 'https://bucket.example.com',
      bucket: 'mock-bucket'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([
    { name: 'light subject', pixel: [255, 255, 255, 255], background: '#000000' },
    { name: 'dark subject', pixel: [0, 0, 0, 255], background: '#FFFFFF' },
    { name: 'transparent image', pixel: [255, 255, 255, 0], background: '#FFFFFF' }
  ])('fits and centers a $name on a contrasting background', async ({ pixel, background }) => {
    mockImage(256, 128)
    const ctx = mockCanvas(new Uint8ClampedArray(pixel))

    const fitted = await fitImageToCanvasWithContrastBg(mockFile('input.png'))

    expect(fitted.name).toBe('input.jpg')
    expect(ctx.drawImage).toHaveBeenNthCalledWith(1, expect.anything(), 0, 128, 512, 256)
    expect(ctx.drawImage).toHaveBeenNthCalledWith(2, expect.anything(), 0, 128, 512, 256)
    expect(ctx.getImageData).toHaveBeenCalledWith(0, 128, 512, 256)
    expect(ctx.imageSmoothingEnabled).toBe(true)
    expect(ctx.imageSmoothingQuality).toBe('high')
    expect(ctx.fillStyle).toBe(background)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 512, 512)
  })

  it('removes the background before fitting an animation reference frame', async () => {
    vi.spyOn(cloudHelpers, 'saveFile').mockResolvedValue('kodo://mock-bucket/test.png')
    mockImage(300, 400)
    const ctx = mockCanvas(new Uint8ClampedArray([0, 0, 0, 255]))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
      })
    )

    const input = mockFile('hero.png')
    const result = await prepareAnimationReferenceImage(input)

    const [taskRecord] = [...aigcMock.tasks.values()]
    expect(taskRecord.task.type).toBe(TaskType.RemoveBackground)
    expect(taskRecord.params).toEqual({ imageUrl: 'kodo://mock-bucket/test.png' })
    expect(result.taskId).toBe(taskRecord.task.id)
    expect(result.file.name).toBe('hero.jpg')
    expect(ctx.drawImage).toHaveBeenNthCalledWith(1, expect.anything(), 64, 0, 384, 512)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 512, 512)
  })
})
