import JSZip from 'jszip'
import { Cancelled } from '@/utils/exception/base'
import { ProgressCollector, ProgressReporter } from '@/utils/progress'
import { toNativeFile, type Files } from '@/models/common/file'

export async function zip(files: Files, reporter: ProgressReporter, signal?: AbortSignal) {
  const collector = ProgressCollector.collectorFor(reporter)
  const filesReporter = collector.getSubReporter({ en: 'Loading project files...', zh: '加载项目文件中...' }, 10)
  const zipReporter = collector.getSubReporter({ en: 'Zipping project files...', zh: '打包项目文件中...' }, 1)

  const zip = new JSZip()
  const filesCollector = ProgressCollector.collectorFor(filesReporter, (info) => ({
    en: `Loading project files (${info.finishedNum}/${info.totalNum})...`,
    zh: `正在加载项目文件（${info.finishedNum}/${info.totalNum}）...`
  }))
  Object.entries(files).forEach(([path, file]) => {
    if (file == null) return
    const r = filesCollector.getSubReporter()
    const nativeFile = toNativeFile(file).then((f) => (r.report(1), f))
    zip.file(path, nativeFile)
  })

  // `zip.generateAsync` is a long-running task without built-in cancellation. We wrap it with `withAbort` so the abort
  // signal propagates.
  const zipped = await withAbort(zip.generateAsync({ type: 'arraybuffer' }), signal)
  zipReporter.report(1)
  return zipped
}

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal == null) return promise
  if (signal.aborted) throw signal.reason ?? new Cancelled('aborted')

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(signal.reason ?? new Cancelled('aborted'))
    signal.addEventListener('abort', handleAbort)
    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort)
        resolve(value)
      },
      (err) => {
        signal.removeEventListener('abort', handleAbort)
        reject(err)
      }
    )
  })
}
