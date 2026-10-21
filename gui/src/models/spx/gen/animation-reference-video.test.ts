import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadImg } from '@/utils/dom'
import { Cancelled, DefaultException } from '@/utils/exception'
import { getRenderableImageUrl } from '@/utils/img-rendering'
import { mockFile } from '../../common/test'
import { Animation } from '../animation'
import { Costume } from '../costume'
import {
  createAnimationReferenceVideo,
  getAnimationReferenceLayout,
  prepareAnimationReferenceVideo
} from './animation-reference-video'

const encoder = vi.hoisted(() => ({
  canEncode: vi.fn<() => Promise<boolean>>(),
  add: vi.fn<(timestamp: number, duration: number) => Promise<void>>(),
  start: vi.fn<() => Promise<void>>(),
  finalize: vi.fn<() => Promise<void>>(),
  cancel: vi.fn<() => Promise<void>>(),
  createSource: vi.fn(),
  addTrack: vi.fn(),
  outputs: [] as Array<{ state: string }>
}))

const decoder = vi.hoisted(() => ({
  dispose: vi.fn(),
  timestamps: [] as number[]
}))

vi.mock('mediabunny', () => ({
  ALL_FORMATS: [],
  BlobSource: class {},
  Input: class {
    getPrimaryVideoTrack() {
      return Promise.resolve({ computeDuration: async () => 6 })
    }
    dispose() {
      decoder.dispose()
    }
  },
  CanvasSink: class {
    async getCanvas() {
      return { canvas: { width: 768, height: 768 } }
    }
    async *canvasesAtTimestamps(timestamps: number[]) {
      for (const timestamp of timestamps) {
        decoder.timestamps.push(timestamp)
        yield { canvas: { width: 768, height: 768 } }
      }
    }
  },
  canEncodeVideo: encoder.canEncode,
  QUALITY_HIGH: 'high',
  Mp4OutputFormat: class {},
  BufferTarget: class {
    buffer: ArrayBuffer | null = null
  },
  CanvasSource: class {
    constructor(canvas: HTMLCanvasElement, config: unknown) {
      encoder.createSource(canvas, config)
    }
    add(timestamp: number, duration: number) {
      return encoder.add(timestamp, duration)
    }
  },
  Output: class {
    state = 'pending'
    target: { buffer: ArrayBuffer | null }
    constructor({ target }: { target: { buffer: ArrayBuffer | null } }) {
      this.target = target
      encoder.outputs.push(this)
    }
    addVideoTrack(source: unknown, metadata: unknown) {
      encoder.addTrack(source, metadata)
    }
    async start() {
      await encoder.start()
      this.state = 'started'
    }
    async finalize() {
      await encoder.finalize()
      this.target.buffer = new Uint8Array([1, 2, 3]).buffer
      this.state = 'finalized'
    }
    async cancel() {
      this.state = 'canceled'
      await encoder.cancel()
    }
  }
}))

vi.mock('@/utils/dom', () => ({ loadImg: vi.fn() }))
vi.mock('@/utils/img-rendering', () => ({ getRenderableImageUrl: vi.fn() }))

function makeAnimation(duration: number, count = 3) {
  return Animation.create(
    'dying',
    Array.from({ length: count }, (_, index) => {
      const file = mockFile(`frame-${index}.png`)
      file.meta.imgSize = { width: 100, height: 80 }
      return new Costume(`frame-${index}`, file, { bitmapResolution: 2, pivot: { x: 10, y: 20 } })
    }),
    { duration }
  )
}

describe('animation reference video', () => {
  let ctx: CanvasRenderingContext2D
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    encoder.outputs.length = 0
    decoder.timestamps.length = 0
    encoder.canEncode.mockReset().mockResolvedValue(true)
    encoder.add.mockReset().mockResolvedValue()
    encoder.start.mockReset().mockResolvedValue()
    encoder.finalize.mockReset().mockResolvedValue()
    encoder.cancel.mockReset().mockResolvedValue()
    vi.mocked(getRenderableImageUrl)
      .mockReset()
      .mockImplementation(async (file) => `blob:${file.name}`)
    vi.mocked(loadImg)
      .mockReset()
      .mockImplementation(async () => document.createElement('img'))
    ctx = { fillRect: vi.fn(), drawImage: vi.fn(), imageSmoothingEnabled: true } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
  })

  it('uses only the selected segment at its original speed and holds its last frame to five seconds', async () => {
    const video = mockFile('source.mp4')
    const file = await prepareAnimationReferenceVideo(video, { startTime: 1000, duration: 1000, interval: 100 })
    expect(file.type).toBe('video/mp4')
    expect(decoder.timestamps).toHaveLength(120)
    expect(decoder.timestamps[0]).toBe(1)
    expect(decoder.timestamps[12]).toBe(1.5)
    expect(decoder.timestamps.slice(24).every((timestamp) => timestamp > 1.99 && timestamp < 2)).toBe(true)
    expect(encoder.add).toHaveBeenLastCalledWith(119 / 24, 1 / 24)
    expect(decoder.dispose).toHaveBeenCalledOnce()
  })

  it('reuses a full-length video without encoding it again', async () => {
    const video = mockFile('source.mp4')
    expect(await prepareAnimationReferenceVideo(video, { duration: 6000, interval: 100 })).toBe(video)
    expect(encoder.start).not.toHaveBeenCalled()
    expect(decoder.dispose).toHaveBeenCalledOnce()
  })

  it('releases video decoding and encoding when preparation is cancelled', async () => {
    const controller = new AbortController()
    encoder.add.mockImplementationOnce(() => new Promise(() => {}))
    const pending = prepareAnimationReferenceVideo(
      mockFile('source.mp4'),
      { duration: 1000, interval: 100 },
      controller.signal
    ).catch((error) => error)
    await vi.waitFor(() => expect(encoder.add).toHaveBeenCalledOnce())
    const reason = new Cancelled('close editor')
    controller.abort(reason)
    expect(await pending).toBeInstanceOf(Cancelled)
    expect(decoder.dispose).toHaveBeenCalledOnce()
    expect(encoder.cancel).toHaveBeenCalledOnce()
    expect(encoder.finalize).not.toHaveBeenCalled()
  })

  it('fits every frame around a shared pivot using its displayed size', async () => {
    const animation = makeAnimation(1, 2)
    animation.costumes[1].img.meta.imgSize = { width: 200, height: 40 }
    animation.costumes[1].setPivot({ x: 30, y: 5 })
    const layout = await getAnimationReferenceLayout(animation)
    expect(layout.size).toBe(768)
    expect(layout.scale).toBeCloseTo(7.68)
    expect(layout.origin.x).toBeCloseTo(230.4)
    expect(layout.origin.y).toBeCloseTo(384)

    await createAnimationReferenceVideo(animation)
    const calls = vi.mocked(ctx.drawImage).mock.calls
    for (const [index, want] of [
      [153.6, 230.4, 384, 307.2],
      [0, 345.6, 768, 153.6]
    ].entries()) {
      want.forEach((value, coordinate) => expect(calls[index * 12][coordinate + 1]).toBeCloseTo(value))
    }
    expect(ctx.fillStyle).toBe('#ffffff')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 768, 768)
    expect(ctx.imageSmoothingEnabled).toBe(false)
    expect(animation.costumes[0].pivot).toEqual({ x: 10, y: 20 })
    expect(animation.duration).toBe(1)
  })

  it.each([
    [0.6, 120],
    [2.1, 120],
    [3, 120],
    [5, 120],
    [5.1, 123],
    [15, 360]
  ])(
    'encodes a %s-second animation at its original speed with at least five seconds of video',
    async (duration, frameCount) => {
      const animation = makeAnimation(duration)
      const file = await createAnimationReferenceVideo(animation)
      expect(file.name).toBe('dying-reference.mp4')
      expect(file.type).toBe('video/mp4')
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
      expect(encoder.add).toHaveBeenCalledTimes(frameCount)
      const images = await Promise.all(vi.mocked(loadImg).mock.results.map((result) => result.value))
      const drawnImages = vi.mocked(ctx.drawImage).mock.calls.map(([image]) => image)
      for (let index = 0; index < frameCount; index++) {
        const [timestamp, sampleDuration] = encoder.add.mock.calls[index]
        expect(timestamp).toBeCloseTo(index / 24)
        expect(sampleDuration).toBeCloseTo(1 / 24)
        expect(drawnImages[index]).toBe(images[Math.min(Math.floor(timestamp / (duration / 3)), 2)])
      }
      expect(encoder.addTrack).toHaveBeenCalledWith(expect.anything(), { frameRate: 24 })
      expect(encoder.createSource).toHaveBeenCalledWith(expect.objectContaining({ width: 768, height: 768 }), {
        codec: 'avc',
        quality: 'high'
      })
      expect(encoder.finalize).toHaveBeenCalledOnce()
      expect(encoder.cancel).not.toHaveBeenCalled()
      expect(vi.mocked(getRenderableImageUrl).mock.calls.every(([, signal]) => signal.aborted)).toBe(true)
    }
  )

  it('keeps the original four-frame attack timing and pads only its final pose to five seconds', async () => {
    const animation = makeAnimation(0.4, 4)
    await createAnimationReferenceVideo(animation)
    const images = await Promise.all(vi.mocked(loadImg).mock.results.map((result) => result.value))
    const drawnImages = vi.mocked(ctx.drawImage).mock.calls.map(([image]) => image)
    expect(drawnImages.map((image) => images.findIndex((frame) => frame === image))).toEqual([
      ...Array(3).fill(0),
      ...Array(2).fill(1),
      ...Array(3).fill(2),
      ...Array(112).fill(3)
    ])
    expect(encoder.add).toHaveBeenLastCalledWith(119 / 24, 1 / 24)
    expect(animation.duration).toBe(0.4)
    expect(animation.costumes).toHaveLength(4)
  })

  it('loads SVG frames through the shared rendering adapter', async () => {
    const animation = makeAnimation(1, 1)
    const svg = mockFile('costume.svg')
    svg.meta.imgSize = { width: 100, height: 80 }
    animation.costumes[0].setImg(svg)
    await createAnimationReferenceVideo(animation)
    expect(getRenderableImageUrl).toHaveBeenCalledWith(svg, expect.any(AbortSignal))
    expect(loadImg).toHaveBeenCalledWith('blob:costume.svg')
    expect(encoder.add).toHaveBeenCalledTimes(120)
    expect(encoder.add).toHaveBeenNthCalledWith(1, 0, 1 / 24)
    expect(encoder.add).toHaveBeenLastCalledWith(119 / 24, 1 / 24)
  })

  it('rejects animations longer than 15 seconds without truncating them', async () => {
    const animation = makeAnimation(15.1)
    await expect(createAnimationReferenceVideo(animation)).rejects.toMatchObject({
      userMessage: { zh: 'AI 修改支持最长 15 秒的动画，请先缩短动画时长。' }
    })
    expect(encoder.canEncode).not.toHaveBeenCalled()
    expect(animation.duration).toBe(15.1)
  })

  it('reports unavailable AVC encoding before loading any frames', async () => {
    encoder.canEncode.mockResolvedValue(false)
    await expect(createAnimationReferenceVideo(makeAnimation(1))).rejects.toBeInstanceOf(DefaultException)
    expect(getRenderableImageUrl).not.toHaveBeenCalled()
    expect(encoder.outputs).toHaveLength(0)
  })

  it('stops pending encoding and releases frame resources when aborted', async () => {
    const ctrl = new AbortController()
    encoder.add.mockImplementationOnce(() => new Promise(() => {}))
    const pending = createAnimationReferenceVideo(makeAnimation(1), ctrl.signal).catch((error) => error)
    await vi.waitFor(() => expect(encoder.add).toHaveBeenCalledOnce())
    const reason = new Cancelled('close editor')
    ctrl.abort(reason)
    expect(await pending).toBeInstanceOf(Cancelled)
    expect(encoder.cancel).toHaveBeenCalledOnce()
    expect(encoder.outputs[0].state).toBe('canceled')
    expect(encoder.finalize).not.toHaveBeenCalled()
    expect(vi.mocked(getRenderableImageUrl).mock.calls.every(([, signal]) => signal.aborted)).toBe(true)
  })

  it('can abort while loading frames before creating an encoder', async () => {
    const ctrl = new AbortController()
    vi.mocked(loadImg).mockImplementation(() => new Promise(() => {}))
    const pending = createAnimationReferenceVideo(makeAnimation(1), ctrl.signal).catch((error) => error)
    await vi.waitFor(() => expect(loadImg).toHaveBeenCalled())
    const reason = new Cancelled('close editor')
    ctrl.abort(reason)
    expect(await pending).toBeInstanceOf(Cancelled)
    expect(encoder.outputs).toHaveLength(0)
    expect(vi.mocked(getRenderableImageUrl).mock.calls.every(([, signal]) => signal.aborted)).toBe(true)
  })

  it('cancels the output when encoding fails', async () => {
    encoder.add.mockRejectedValueOnce(new Error('Encoder failed'))
    await expect(createAnimationReferenceVideo(makeAnimation(1))).rejects.toThrow('Encoder failed')
    expect(encoder.cancel).toHaveBeenCalledOnce()
    expect(encoder.finalize).not.toHaveBeenCalled()
  })

  it('rejects an already aborted signal before checking codec support', async () => {
    const ctrl = new AbortController()
    const reason = new Cancelled('close editor')
    ctrl.abort(reason)
    await expect(createAnimationReferenceVideo(makeAnimation(1), ctrl.signal)).rejects.toBe(reason)
    expect(encoder.canEncode).not.toHaveBeenCalled()
  })
})
