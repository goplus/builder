/**
 * @desc File-related APIs of spx-backend
 */

import { usercontentBaseUrl, usercontentBucket } from '@/utils/env'
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

export function createUploadSession() {
  return client.post('/upload-sessions') as Promise<UploadSession>
}

export async function createFileURLSignatures(objects: UniversalUrl[]): Promise<UniversalToWebUrlMap> {
  // TODO(#1598): Restore the `/file-url-signatures` call after signed file URLs are fixed.
  return workAroundIssue1598(objects)

  // const result = (await client.post('/file-url-signatures', { objects })) as { objectUrls: UniversalToWebUrlMap }
  // return result.objectUrls
}

/** Workaround for https://github.com/goplus/builder/issues/1598 */
function workAroundIssue1598(objects: UniversalUrl[]): UniversalToWebUrlMap {
  return objects.reduce((map, universalUrl) => {
    const parsed = parseUniversalUrl(universalUrl)
    if (parsed.scheme === UniversalUrlScheme.Kodo) {
      if (parsed.bucket !== usercontentBucket)
        console.warn(`unexpected bucket ${parsed.bucket}, expected ${usercontentBucket}`)
      map[universalUrl] = `${usercontentBaseUrl}/${parsed.key}`
    } else {
      map[universalUrl] = universalUrl
    }
    return map
  }, {} as UniversalToWebUrlMap)
}
