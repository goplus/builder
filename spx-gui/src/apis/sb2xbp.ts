import { client } from './common'

/**
 * Convert Scratch project (.sb2/.sb3) to XBuilder project (.xbp) via backend `/scratch-convert` endpoint.
 * The backend is expected to return the converted xbp as binary response (200).
 *
 * Uses shared `client` so token, Sentry headers and timeout behavior are consistent with other APIs.
 *
 * @param file - The Scratch project file (.sb2 or .sb3) to convert
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise that resolves to a Blob containing the converted .xbp file
 * @throws {ApiException} When the server returns an error response
 * @throws {TimeoutException} When the request exceeds the timeout duration
 */
export async function convertScratchToXbp(file: File, signal?: AbortSignal) {
  const MAX_FILE_SIZE = 32 * 1024 * 1024 // 32MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 32MB')
  }
  const form = new FormData()
  form.append('file', file, file.name)

  const blob = await client.postBinary('/util/sb2xbp', form, { signal })
  return blob
}
