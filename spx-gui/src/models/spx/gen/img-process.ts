import { extname, stripExt } from '@/utils/path'
import { getMimeFromExt } from '@/utils/file'
import { toJpeg } from '@/utils/img'
import { parseUniversalUrl, stringifyKodoUrl, UniversalUrlScheme } from '@/utils/universal-url'
import { taskRemoveBackgroundSupportedImgExts, TaskType } from '@/apis/aigc'
import { createFileWithUniversalUrl, saveFile } from '@/models/common/cloud'
import { fromBlob, toNativeFile, type File } from '@/models/common/file'
import { Task } from './common'

// The animation backend recognizes this exact FOP and normalizes the image to generated-costume dimensions.
const costumeReferenceFop = 'imageView2/1/w/512/h/512/format/png/colors/256'

/**
 * Adapt image file to fit AIGC remove background.
 * Unsupported image files will be converted to jpeg.
 */
export async function adaptImgForBackgroundRemoval(file: File): Promise<File> {
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
  signal?.throwIfAborted()
  const task = new Task(TaskType.RemoveBackground)
  const cancelTask = () => {
    void task.tryCancel()
    task.dispose()
  }
  signal?.addEventListener('abort', cancelTask, { once: true })
  try {
    await task.start({ imageUrl: universalUrl })
    const { imageUrl: resultUniversalUrl } = await task.untilCompleted()
    const name = stripExt(inputFile.name) + extname(resultUniversalUrl)
    return createFileWithUniversalUrl(resultUniversalUrl, name)
  } finally {
    signal?.removeEventListener('abort', cancelTask)
    task.dispose()
  }
}

/** Apply the Kodo image processing that the backend attaches to generated costumes. */
export function toCostumeReferenceImageUrl(url: string) {
  const parsed = parseUniversalUrl(url)
  if (parsed.scheme !== UniversalUrlScheme.Kodo || parsed.key.includes('?')) {
    throw new Error('unprocessed Kodo image URL expected')
  }
  return stringifyKodoUrl(parsed.bucket, `${parsed.key}?${costumeReferenceFop}`)
}
