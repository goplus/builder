/**
 * @desc util-related APIs of spx-backend
 */

import { usercontentBaseUrl } from '@/utils/env'
import { client, type UniversalUrl, type UniversalToWebUrlMap } from './common'
import { UniversalUrlScheme, parseUniversalUrl } from '@/utils/universal-url'

export type UpInfo = {
  /** Uptoken */
  token: string
  /** Valid time for uptoken, unit: second */
  expires: number
  /** Maximum file size allowed in bytes */
  maxSize: number
  /** Bucket name */
  bucket: string
  /** Bucket Region */
  region: string
}

export function getUpInfo() {
  return client.get('/util/upinfo') as Promise<UpInfo>
}

export async function makeObjectUrls(objects: UniversalUrl[]): Promise<UniversalToWebUrlMap> {
  return workAroundIssue1598(objects)

  // const result = (await client.post('/util/fileurls', { objects: objects })) as { objectUrls: UniversalToWebUrlMap }
  // return result.objectUrls
}

/** Workaround for https://github.com/goplus/builder/issues/1598 */
function workAroundIssue1598(objects: UniversalUrl[]): UniversalToWebUrlMap {
  return objects.reduce((map, universalUrl) => {
    const parsed = parseUniversalUrl(universalUrl)
    map[universalUrl] = parsed.scheme === UniversalUrlScheme.Kodo ? `${usercontentBaseUrl}/${parsed.key}` : universalUrl
    return map
  }, {} as UniversalToWebUrlMap)
}
