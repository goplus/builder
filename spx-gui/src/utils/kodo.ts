import { mapValues } from 'lodash'
import { regionUphostMap } from './kodo-regions'

const uphostsByRegion: Record<string, string[] | undefined> = mapValues(regionUphostMap, ({ srcUphost, cdnUphost }) => [
  ...cdnUphost,
  ...srcUphost
])

export function getUphostsByRegion(region: string) {
  return uphostsByRegion[region]
}

const qiniuEtagBlockSize = 4 * 1024 * 1024
const qiniuSingleBlockEtagPrefix = 0x16
const qiniuMultiBlockEtagPrefix = 0x96
const sha1DigestSize = 20

/** Calculate the Qiniu ETag. See https://github.com/qiniu/qetag. */
export async function calculateQiniuEtag(data: ArrayBuffer) {
  // Empty files still have one SHA-1 block.
  const blockCount = Math.max(1, Math.ceil(data.byteLength / qiniuEtagBlockSize))
  const blockHashes = await Promise.all(
    Array.from({ length: blockCount }, (_, index) => {
      const start = index * qiniuEtagBlockSize
      const length = Math.min(qiniuEtagBlockSize, data.byteLength - start)
      return crypto.subtle.digest('SHA-1', new Uint8Array(data, start, length))
    })
  )
  const blockHashData = new Uint8Array(blockHashes.length * sha1DigestSize)
  blockHashes.forEach((blockHash, index) => blockHashData.set(new Uint8Array(blockHash), index * sha1DigestSize))
  const hash =
    blockHashes.length === 1
      ? new Uint8Array(blockHashes[0]!)
      : new Uint8Array(await crypto.subtle.digest('SHA-1', blockHashData))
  const etag = new Uint8Array(hash.byteLength + 1)
  etag[0] = blockHashes.length === 1 ? qiniuSingleBlockEtagPrefix : qiniuMultiBlockEtagPrefix
  etag.set(hash, 1)
  return btoa(String.fromCharCode(...etag))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
