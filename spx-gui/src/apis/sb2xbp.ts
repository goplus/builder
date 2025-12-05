import { DefaultException } from '@/utils/exception'
import { client } from './common'
import { humanizeFileSize } from '@/utils/utils'

const maxFileSize = 32 * 1024 * 1024 // 32MB

/**
 * Convert Scratch project (.sb2/.sb3) to XBuilder project (.xbp) via backend `/scratch-convert` endpoint.
 * The backend is expected to return the converted xbp as binary response (200).
 *
 * Uses shared `client` so token, Sentry headers and timeout behavior are consistent with other APIs.
 */
export async function convertScratchToXbp(file: File, signal?: AbortSignal) {
  if (file.size > maxFileSize) {
    const maxFileSizeHumanized = humanizeFileSize(maxFileSize)
    throw new DefaultException({
      en: `File size exceeds limit (max ${maxFileSizeHumanized.en})`,
      zh: `文件尺寸超限（最大 ${maxFileSizeHumanized.zh})`
    })
  }
  const form = new FormData()
  form.append('file', file, file.name)

  const blob = await client.postBinary('/util/sb2xbp', form, { signal })
  return blob
}
