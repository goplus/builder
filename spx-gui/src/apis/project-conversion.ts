import { DefaultException } from '@/utils/exception'
import { client } from './common'
import { humanizeFileSize } from '@/utils/utils'

const maxFileSize = 64 * 1024 * 1024 // 64MB
const convertTimeout = 60 * 1000 // 60s

/**
 * Convert Scratch project (.sb2/.sb3) to XBuilder project (.xbp) via backend `/project-conversions` endpoint.
 * The backend is expected to return the converted xbp as binary response (200).
 *
 * Uses shared `client` so token and Sentry headers are consistent with other APIs.
 * A custom timeout is applied because Scratch conversion is significantly slower than typical API calls.
 */
export async function convertScratchProject(file: File, signal?: AbortSignal) {
  if (file.size > maxFileSize) {
    const maxFileSizeHumanized = humanizeFileSize(maxFileSize)
    throw new DefaultException({
      en: `File size exceeds limit (max ${maxFileSizeHumanized.en})`,
      zh: `文件尺寸超限（最大 ${maxFileSizeHumanized.zh})`
    })
  }
  const form = new FormData()
  form.append('file', file, file.name)

  const blob = await client.postBinary('/project-conversions', form, { signal, timeout: convertTimeout })
  return blob as Blob
}
