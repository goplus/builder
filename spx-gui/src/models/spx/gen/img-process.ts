import { extname, stripExt } from '@/utils/path'
import { getMimeFromExt } from '@/utils/file'
import { toJpeg } from '@/utils/img'
import { getImgDrawingCtx } from '@/utils/canvas'
import { loadImg } from '@/utils/dom'
import { Disposable, promiseForSignal } from '@/utils/disposable'
import { taskRemoveBackgroundSupportedImgExts, TaskType } from '@/apis/aigc'
import { createFileWithUniversalUrl, saveFile } from '@/models/common/cloud'
import { fromBlob, toNativeFile, type File } from '@/models/common/file'
import { Task } from './common'

/**
 * Adapt image file to fit AIGC remove background.
 * Unsupported image files will be converted to jpeg.
 */
async function adaptImgForBackgroundRemoval(file: File): Promise<File> {
  for (const ext of taskRemoveBackgroundSupportedImgExts) {
    if (file.type === getMimeFromExt(ext)) return file
  }
  const jpegBlob = await toJpeg(await toNativeFile(file))
  const jpegFileName = stripExt(file.name) + '.jpeg'
  return fromBlob(jpegFileName, jpegBlob)
}

/**
 * Remove background from an image file using AIGC RemoveBackground task.
 */
export async function removeImageBackground(inputFile: File, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const adaptedFile = await adaptImgForBackgroundRemoval(inputFile)
  const universalUrl = await saveFile(adaptedFile, signal)
  const task = new Task(TaskType.RemoveBackground)
  const cancelTask = () => {
    void task.tryCancel()
    task.dispose()
  }
  signal?.addEventListener('abort', cancelTask, { once: true })
  try {
    await task.start({ imageUrl: universalUrl })
    const { imageUrl: resultUniversalUrl } = await task.untilCompleted()
    const taskId = task.data?.id
    if (taskId == null) throw new Error('remove background task ID expected')
    const name = stripExt(inputFile.name) + extname(resultUniversalUrl)
    return {
      file: createFileWithUniversalUrl(resultUniversalUrl, name),
      taskId
    }
  } finally {
    signal?.removeEventListener('abort', cancelTask)
    task.dispose()
  }
}

function isLightSubject(imageData: ImageData): boolean {
  const { data } = imageData
  let visiblePixels = 0
  let luminanceSum = 0

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    luminanceSum += 2126 * data[i] + 7152 * data[i + 1] + 722 * data[i + 2]
    visiblePixels++
  }

  return visiblePixels > 0 && luminanceSum >= visiblePixels * 128 * 10_000
}

function createCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    return { canvas, ctx: getImgDrawingCtx(canvas) }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: getImgDrawingCtx(canvas) }
}

function canvasToJpeg(canvas: HTMLCanvasElement | OffscreenCanvas) {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 })
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result != null) resolve(result)
        else reject(new Error('Failed to convert canvas to blob'))
      },
      'image/jpeg',
      0.95
    )
  })
}

export async function fitImageToCanvasWithContrastBg(
  file: File,
  targetWidth = 512,
  targetHeight = 512,
  signal?: AbortSignal
): Promise<File> {
  signal?.throwIfAborted()
  const disposable = new Disposable()
  const disposeOnAbort = () => disposable.dispose()
  signal?.addEventListener('abort', disposeOnAbort, { once: true })
  try {
    const url = await file.url((fn) => disposable.addDisposer(fn))
    signal?.throwIfAborted()
    const img = await (signal == null ? loadImg(url) : Promise.race([loadImg(url), promiseForSignal(signal)]))
    signal?.throwIfAborted()

    const naturalWidth = img.naturalWidth || targetWidth
    const naturalHeight = img.naturalHeight || targetHeight
    const scale = Math.min(targetWidth / naturalWidth, targetHeight / naturalHeight)
    const drawWidth = naturalWidth * scale
    const drawHeight = naturalHeight * scale
    const dx = (targetWidth - drawWidth) / 2
    const dy = (targetHeight - drawHeight) / 2

    const { canvas, ctx } = createCanvas(targetWidth, targetHeight)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight)
    const sampleX = Math.floor(dx)
    const sampleY = Math.floor(dy)
    const imageData = ctx.getImageData(
      sampleX,
      sampleY,
      Math.ceil(dx + drawWidth) - sampleX,
      Math.ceil(dy + drawHeight) - sampleY
    )
    ctx.fillStyle = isLightSubject(imageData) ? '#000000' : '#FFFFFF'
    ctx.fillRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight)

    return fromBlob(`${stripExt(file.name)}.jpg`, await canvasToJpeg(canvas))
  } finally {
    signal?.removeEventListener('abort', disposeOnAbort)
    disposable.dispose()
  }
}

/**
 * Process a user local image for animation reference frame:
 * 1. Remove background
 * 2. Proportional scale and center into 512x512
 * 3. Fill solid contrasting background (black if subject is light, white if dark)
 */
export async function prepareAnimationReferenceImage(file: File, signal?: AbortSignal) {
  const { file: noBgFile, taskId } = await removeImageBackground(file, signal)
  return {
    file: await fitImageToCanvasWithContrastBg(noBgFile, 512, 512, signal),
    taskId
  }
}
