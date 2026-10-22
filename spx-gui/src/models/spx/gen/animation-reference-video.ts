import type { BufferTarget, Mp4OutputFormat, Output } from 'mediabunny'
import { getImgDrawingCtx } from '@/utils/canvas'
import { Disposable, promiseForSignal } from '@/utils/disposable'
import { loadImg } from '@/utils/dom'
import { DefaultException } from '@/utils/exception'
import { getRenderableImageUrl } from '@/utils/img-rendering'
import { fromBlob, toNativeFile, type File } from '../../common/file'
import type { Animation } from '../animation'
import type { FramesConfig } from './animation-gen'

const videoSize = 768
const videoFrameRate = 24

export async function prepareAnimationReferenceVideo(video: File, range: FramesConfig | null, signal?: AbortSignal) {
  signal?.throwIfAborted()
  if (range == null) return video
  const {
    Input,
    BlobSource,
    ALL_FORMATS,
    CanvasSink,
    CanvasSource,
    Output,
    Mp4OutputFormat,
    BufferTarget,
    QUALITY_HIGH
  } = await import('mediabunny')
  const input = new Input({ source: new BlobSource(await toNativeFile(video, signal)), formats: ALL_FORMATS })
  const resources = new Disposable()
  resources.addDisposer(() => input.dispose())
  if (signal != null) resources.disposeOnSignal(signal)
  const encodingSignal = resources.getSignal()
  const aborted = promiseForSignal(encodingSignal)
  let output: Output<Mp4OutputFormat, BufferTarget> | null = null
  let cancelPromise: Promise<void> | null = null
  const cancelOutput = () => {
    if (output == null) return
    cancelPromise = output.cancel()
    cancelPromise.catch(() => {})
  }
  try {
    const track = await Promise.race([input.getPrimaryVideoTrack(), aborted])
    if (track == null) throw new Error('Reference video has no video track')
    const videoDuration = await Promise.race([track.computeDuration(), aborted])
    const start = Math.max(0, (range.startTime ?? 0) / 1000)
    const end = Math.min(videoDuration, start + range.duration / 1000)
    if (start === 0 && Math.abs(end - videoDuration) < 0.001 && videoDuration >= 5) return video
    if (!(end > start)) throw new Error('Reference video selection is empty')
    const sink = new CanvasSink(track, { poolSize: 1 })
    const firstFrame = await Promise.race([sink.getCanvas(start), aborted])
    if (firstFrame == null) throw new Error('Reference video selection has no frames')
    const canvas = document.createElement('canvas')
    canvas.width = firstFrame.canvas.width
    canvas.height = firstFrame.canvas.height
    const ctx = getImgDrawingCtx(canvas)
    const source = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH })
    output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
    output.addVideoTrack(source, { frameRate: videoFrameRate })
    encodingSignal.addEventListener('abort', cancelOutput, { once: true })
    await Promise.race([output.start(), aborted])
    const frameCount = Math.ceil(Math.max(5, end - start) * videoFrameRate)
    const timestamps = Array.from({ length: frameCount }, (_, i) =>
      Math.min(start + i / videoFrameRate, end - 0.000001)
    )
    const frames = sink.canvasesAtTimestamps(timestamps)
    try {
      for (let i = 0; i < frameCount; i++) {
        const { value: frame } = await Promise.race([frames.next(), aborted])
        if (frame == null) throw new Error('Reference video selection has no frames')
        ctx.drawImage(frame.canvas, 0, 0)
        await Promise.race([source.add(i / videoFrameRate, 1 / videoFrameRate), aborted])
      }
    } finally {
      await frames.return()
    }
    await Promise.race([output.finalize(), aborted])
    return fromBlob('animation-reference.mp4', new Blob([output.target.buffer!], { type: 'video/mp4' }))
  } finally {
    encodingSignal.removeEventListener('abort', cancelOutput)
    try {
      if (cancelPromise != null) await cancelPromise
      else if (output != null && output.state !== 'finalized') await output.cancel()
    } finally {
      resources.dispose()
    }
  }
}

export async function getAnimationReferenceLayout(animation: Animation) {
  if (animation.costumes.length === 0) {
    throw new DefaultException({ en: 'This animation has no frames to edit.', zh: '这个动画没有可修改的帧。' })
  }
  const bounds = await Promise.all(
    animation.costumes.map(async (costume) => {
      const size = await costume.getSize()
      return {
        left: -costume.pivot.x,
        top: -costume.pivot.y,
        right: size.width - costume.pivot.x,
        bottom: size.height - costume.pivot.y
      }
    })
  )
  const left = Math.min(...bounds.map((bound) => bound.left))
  const top = Math.min(...bounds.map((bound) => bound.top))
  const width = Math.max(...bounds.map((bound) => bound.right)) - left
  const height = Math.max(...bounds.map((bound) => bound.bottom)) - top
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
    throw new DefaultException({ en: 'The animation frames have invalid dimensions.', zh: '动画帧的尺寸无效。' })
  }
  const scale = Math.min(videoSize / width, videoSize / height)
  return {
    size: videoSize,
    scale,
    origin: {
      x: (videoSize - width * scale) / 2 - left * scale,
      y: (videoSize - height * scale) / 2 - top * scale
    }
  }
}

export async function createAnimationReferenceVideo(animation: Animation, signal?: AbortSignal): Promise<File> {
  signal?.throwIfAborted()
  const duration = animation.duration
  if (!(duration > 0 && Number.isFinite(duration))) {
    throw new DefaultException({ en: 'The animation duration must be greater than zero.', zh: '动画时长必须大于零。' })
  }
  if (duration > 15) {
    throw new DefaultException({
      en: 'AI editing supports animations up to 15 seconds. Shorten this animation before editing it.',
      zh: 'AI 修改支持最长 15 秒的动画，请先缩短动画时长。'
    })
  }

  const resources = new Disposable()
  if (signal != null) resources.disposeOnSignal(signal)
  const encodingSignal = resources.getSignal()
  const aborted = promiseForSignal(encodingSignal)
  let output: Output<Mp4OutputFormat, BufferTarget> | null = null
  let cancelPromise: Promise<void> | null = null
  const cancelOutput = () => {
    if (output == null) return
    cancelPromise = output.cancel()
    cancelPromise.catch(() => {})
  }
  try {
    const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo, QUALITY_HIGH } = await Promise.race([
      import('mediabunny'),
      aborted
    ])
    const canEncode = await Promise.race([
      canEncodeVideo('avc', { width: videoSize, height: videoSize, quality: QUALITY_HIGH }),
      aborted
    ])
    if (!canEncode) {
      throw new DefaultException({
        en: 'This browser cannot create the MP4 video needed for AI editing. Try an up-to-date Chrome, Edge, or Safari browser.',
        zh: '当前浏览器无法生成 AI 修改所需的 MP4 视频，请尝试使用新版 Chrome、Edge 或 Safari。'
      })
    }
    const [layout, frames] = await Promise.race([
      Promise.all([
        getAnimationReferenceLayout(animation),
        Promise.all(
          animation.costumes.map(async (costume) => {
            const [img, size] = await Promise.all([
              getRenderableImageUrl(costume.img, encodingSignal).then((url) => loadImg(url)),
              costume.getSize()
            ])
            return { img, size, pivot: { ...costume.pivot } }
          })
        )
      ]),
      aborted
    ])
    encodingSignal.throwIfAborted()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = layout.size
    const ctx = getImgDrawingCtx(canvas)
    const source = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH })
    output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
    output.addVideoTrack(source, { frameRate: videoFrameRate })
    encodingSignal.addEventListener('abort', cancelOutput, { once: true })
    await Promise.race([output.start(), aborted])
    const frameDuration = duration / frames.length
    const videoFrameCount = Math.ceil(Math.max(5, duration) * videoFrameRate)
    for (let index = 0; index < videoFrameCount; index++) {
      encodingSignal.throwIfAborted()
      const timestamp = index / videoFrameRate
      // Pad short references with their last frame without stretching or repeating the action.
      const frame = frames[Math.min(Math.floor(timestamp / frameDuration), frames.length - 1)]
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, layout.size, layout.size)
      ctx.drawImage(
        frame.img,
        layout.origin.x - frame.pivot.x * layout.scale,
        layout.origin.y - frame.pivot.y * layout.scale,
        frame.size.width * layout.scale,
        frame.size.height * layout.scale
      )
      await Promise.race([source.add(timestamp, 1 / videoFrameRate), aborted])
    }
    await output.finalize()
    encodingSignal.throwIfAborted()
    return fromBlob(`${animation.name}-reference.mp4`, new Blob([output.target.buffer!], { type: 'video/mp4' }))
  } finally {
    encodingSignal.removeEventListener('abort', cancelOutput)
    try {
      if (cancelPromise != null) await cancelPromise
      else if (output != null && output.state !== 'finalized') await output.cancel()
    } finally {
      resources.dispose()
    }
  }
}
