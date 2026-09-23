import { extname, stripExt } from '@/utils/path'
import { getMimeFromExt } from '@/utils/file'
import { toJpeg } from '@/utils/img'
import { taskRemoveBackgroundSupportedImgExts, TaskType } from '@/apis/aigc'
import { createFileWithUniversalUrl, saveFile } from '@/models/common/cloud'
import { fromBlob, toNativeFile, type File } from '@/models/common/file'
import { Task } from './common'

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
