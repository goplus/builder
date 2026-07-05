/**
 * @desc File-related APIs of spx-backend
 */

import { client, type UniversalUrl, type UniversalToWebUrlMap } from './common'
import { UniversalUrlScheme, parseUniversalUrl } from '@/utils/universal-url'

export type UploadSession = {
  /** Uptoken */
  token: string
  /** Expiration timestamp for uptoken */
  expiresAt: string
  /** Maximum file size allowed in bytes */
  maxSize: number
  /** Bucket name */
  bucket: string
  /** Bucket Region */
  region: string
}

export type FileURLSignatureConfig = {
  baseUrl: string
  bucket: string
}

export function createUploadSession() {
  return client.post('/upload-sessions') as Promise<UploadSession>
}

export async function createFileURLSignatures(
  objects: UniversalUrl[],
  config: FileURLSignatureConfig
): Promise<UniversalToWebUrlMap> {
  // TODO(#1598): Restore the `/file-url-signatures` call after signed file URLs are fixed.
  return workAroundIssue1598(objects, config)

  // const result = (await client.post('/file-url-signatures', { objects })) as { objectUrls: UniversalToWebUrlMap }
  // return result.objectUrls
}

/** Workaround for https://github.com/goplus/builder/issues/1598 */
function workAroundIssue1598(objects: UniversalUrl[], config: FileURLSignatureConfig): UniversalToWebUrlMap {
  const { baseUrl, bucket } = config
  return objects.reduce((map, universalUrl) => {
    const parsed = parseUniversalUrl(universalUrl)
    if (parsed.scheme === UniversalUrlScheme.Kodo) {
      if (parsed.bucket !== bucket) console.warn(`unexpected bucket ${parsed.bucket}, expected ${bucket}`)
      map[universalUrl] = `${baseUrl}/${parsed.key}`
    } else {
      map[universalUrl] = universalUrl
    }
    return map
  }, {} as UniversalToWebUrlMap)
}
