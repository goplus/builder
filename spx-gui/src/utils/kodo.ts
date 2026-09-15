import { mapValues } from 'lodash'

/**
 * Upload regions.
 * Copied from https://github.com/qiniu/js-sdk/blob/a98e9b8238e8c1b5e69c2c47870300058e2d1a28/src/config/region.ts
 * As of version v4.x, this is not exported by the official SDK anymore.
 */
const regions = {
  z0: 'z0',
  z1: 'z1',
  z2: 'z2',
  na0: 'na0',
  as0: 'as0',
  cnEast2: 'cn-east-2'
} as const

/**
 * Upload region corresponding hosts.
 * Copied from https://github.com/qiniu/js-sdk/blob/a98e9b8238e8c1b5e69c2c47870300058e2d1a28/src/config/region.ts
 * As of version v4.x, this is not exported by the official SDK anymore.
 */
const regionUphostMap = {
  [regions.z0]: {
    srcUphost: ['up.qiniup.com'],
    cdnUphost: ['upload.qiniup.com']
  },
  [regions.z1]: {
    srcUphost: ['up-z1.qiniup.com'],
    cdnUphost: ['upload-z1.qiniup.com']
  },
  [regions.z2]: {
    srcUphost: ['up-z2.qiniup.com'],
    cdnUphost: ['upload-z2.qiniup.com']
  },
  [regions.na0]: {
    srcUphost: ['up-na0.qiniup.com'],
    cdnUphost: ['upload-na0.qiniup.com']
  },
  [regions.as0]: {
    srcUphost: ['up-as0.qiniup.com'],
    cdnUphost: ['upload-as0.qiniup.com']
  },
  [regions.cnEast2]: {
    srcUphost: ['up-cn-east-2.qiniup.com'],
    cdnUphost: ['upload-cn-east-2.qiniup.com']
  }
}

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

/** Calculate the Qiniu ETag. See https://github.com/qiniu/qetag. */
export async function calculateQiniuEtag(data: ArrayBuffer) {
  const blockHashes = await Promise.all(
    Array.from({ length: Math.max(1, Math.ceil(data.byteLength / qiniuEtagBlockSize)) }, (_, index) => {
      const start = index * qiniuEtagBlockSize
      return crypto.subtle.digest('SHA-1', data.slice(start, start + qiniuEtagBlockSize))
    })
  )
  const blockHashData = new Uint8Array(blockHashes.length * 20)
  blockHashes.forEach((blockHash, index) => blockHashData.set(new Uint8Array(blockHash), index * 20))
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
