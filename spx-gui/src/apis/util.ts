/**
 * @desc util-related APIs of spx-backend
 */

import { client, type UniversalUrl, type UniversalToWebUrlMap } from './common'

export interface FormatError {
  column: number
  line: number
  msg: string
}

export interface FormatResponse {
  body: string
  error?: FormatError
}

export function formatSpxCode(body: string) {
  return client.post('/util/fmtcode', { body }) as Promise<FormatResponse>
}

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

export const makeObjectUrls = (() => {
  const make = async (objects: UniversalUrl[]) => {
    const res = (await client.post('/util/fileurls', { objects: objects })) as {
      objectUrls: UniversalToWebUrlMap
    }
    return res.objectUrls
  }

  const batch = new Set<UniversalUrl>()
  let batchPromise: Promise<UniversalToWebUrlMap> | null = null
  const processBatch = () => {
    const currentBatch = Array.from(batch)
    batch.clear()
    batchPromise = null
    return make(currentBatch)
  }

  return async (objects: UniversalUrl[], immediate = false): Promise<UniversalToWebUrlMap> => {
    if (immediate) return make(objects)

    objects.forEach((url) => batch.add(url))
    if (batchPromise == null) {
      batchPromise = new Promise((resolve) => setTimeout(() => resolve(processBatch()), 15))
    }
    const objectUrls = await batchPromise
    return Object.fromEntries(objects.map((url) => [url, objectUrls[url]]))
  }
})()
