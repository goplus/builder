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
