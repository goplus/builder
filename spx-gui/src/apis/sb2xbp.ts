import { client } from './common'

/**
 * Convert Scratch project (.sb3) to XBuilder project (.xbp) via backend `/scratch-convert` endpoint.
 * The backend is expected to return the converted xbp as binary response (200).
 *
 * Uses shared `client` so token, Sentry headers and timeout behavior are consistent with other APIs.
 */
export async function convertScratchToXbp(file: File, signal?: AbortSignal) {
  const form = new FormData()
  form.append('file', file, file.name)

  const blob = await client.postBinary('/scratch-convert', form, { signal })
  return blob
}

