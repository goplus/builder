/**
 * Universal URL.
 * We define Universal URL to refer to files in projects (and assets).
 * Different schemes are supported to cover different storage backends.
 * Check https://github.com/goplus/builder/issues/369#issuecomment-2167100296 for details.
 */

/** Universal URL schemes */
export const enum UniversalUrlScheme {
  /** Standard HTTP URLs, for resources stored in third-party services */
  Http = 'http',
  /** Standard HTTPS URLs, for resources stored in third-party services */
  Https = 'https',
  /** For inlineable data, usually plain text or json, e.g. `data:text/plain,hello%20world` */
  Data = 'data',
  /** For objects stored in Qiniu Kodo, e.g. `kodo://bucket/key` */
  Kodo = 'kodo'
}

export type HttpUrlParsed = { scheme: UniversalUrlScheme.Http | UniversalUrlScheme.Https; url: string }
export type DataUrlParsed = { scheme: UniversalUrlScheme.Data; url: string }
export type KodoUrlParsed = { scheme: UniversalUrlScheme.Kodo; bucket: string; key: string }

export type UniversalUrlParsed = HttpUrlParsed | DataUrlParsed | KodoUrlParsed

export function getUniversalUrlScheme(urlStr: string): UniversalUrlScheme {
  // We are not using URL class here because it introduces incorrect parsing behavior for custom schemes like `kodo://`
  // in old browsers (Edge before v133, etc.). For details, see https://github.com/goplus/builder/pull/1599#discussion_r2076699843
  const idx = urlStr.indexOf(':')
  if (idx < 0) throw new Error(`invalid universal url: ${urlStr.slice(0, 200)}`)
  const scheme = urlStr.slice(0, idx)
  switch (scheme) {
    case UniversalUrlScheme.Http:
    case UniversalUrlScheme.Https:
    case UniversalUrlScheme.Data:
    case UniversalUrlScheme.Kodo:
      return scheme
    default:
      throw new Error(`unsupported universal url scheme: ${scheme} in url: ${urlStr.slice(0, 200)}`)
  }
}

function parseKodoUrl(urlStr: string): KodoUrlParsed {
  const body = urlStr.slice('kodo://'.length)
  const slashIdx = body.indexOf('/')
  if (slashIdx < 0) throw new Error(`invalid kodo universal url: ${urlStr.slice(0, 200)}`)
  const bucket = body.slice(0, slashIdx)
  const key = body.slice(slashIdx + 1)
  return { scheme: UniversalUrlScheme.Kodo, bucket, key }
}

export function parseUniversalUrl(urlStr: string): UniversalUrlParsed {
  const scheme = getUniversalUrlScheme(urlStr)
  switch (scheme) {
    case UniversalUrlScheme.Http:
    case UniversalUrlScheme.Https:
    case UniversalUrlScheme.Data:
      return { scheme, url: urlStr }
    case UniversalUrlScheme.Kodo: {
      return parseKodoUrl(urlStr)
    }
    default:
      throw new Error(`unsupported universal url scheme: ${scheme} in url: ${urlStr.slice(0, 200)}`)
  }
}

// For now only text data is supported. We may support binary data (with base64) in the future.
export function stringifyDataUrl(mimeType: string, data: string): string {
  // Little trick from [https://fetch.spec.whatwg.org/#data-urls]: `12. If mimeType starts with ';', then prepend 'text/plain' to mimeType.`
  // Saves some bytes.
  mimeType = mimeType === 'text/plain' ? ';' : mimeType
  return `data:${mimeType},${encodeURIComponent(data)}`
}

export function stringifyKodoUrl(bucket: string, key: string): string {
  return `kodo://${bucket}/${key}`
}
