/**
 * @desc AI-related APIs of spx-backend
 */

import type { AssetData, AssetType } from './asset'
import { client, type FileCollection } from './common'

export async function matting(imageUrl: string) {
  const result = (await client.post('/aigc/matting', { imageUrl }, { timeout: 20 * 1000 })) as {
    imageUrl: string
  }
  return result.imageUrl
}

export type AIAssetData<T extends AssetType = AssetType> = {
  /** Globally unique ID */
  id: string
  /** Name to display */
  displayName?: string
  // /** Asset Category */
  // category: string
  /** Asset Type */
  assetType: T
  /** Files the asset contains */
  files?: FileCollection
  /** Hash of the files */
  filesHash?: string
  /** Preview URL for the asset, e.g., a gif for a sprite */
  preview?: string
  /** Creation time */
  cTime: string
  status: AIGCStatus
}

export const isAiAsset = Symbol('isAiAsset')
export const isPreviewReady = Symbol('isPreviewReady')
export const isContentReady = Symbol('isContentReady')
export type TaggedAIAssetData<T extends AssetType = AssetType> = AIAssetData<T> & {
  [isAiAsset]: true
  [isPreviewReady]: boolean
  [isContentReady]: boolean
}
export type AssetOrAIAsset = AssetData | TaggedAIAssetData

export interface CreateAIImageParams {
  keyword: string
  category: string | string[]
  assetType: AssetType
  width?: number
  height?: number
}

const mockAIImage = {
  imageUri: [
    'kodo://goplus-builder-static-test/files/FvEYel08GXL60vuviffq9sW-9xZs/IMG20230406220355.jpg',
    'kodo://goplus-builder-static-test/files/FtzNex_e0lYKKn7S52HTG42d9Mm9-6906',
    'kodo://goplus-builder-static-test/files/FvbBWmTdYLqyx_Mn_wCF6KAhfZXn-5443'
  ]
}

const mockAISprite = [
  {
    files: {
      'assets/sprites/Samurai/__animation_default_idle-1.png':
        'kodo://goplus-builder-static-test/files/FhfO2aqtGzCIfIBM003pVb2u2bm8-1951',
      'assets/sprites/Samurai/__animation_default_idle-2.png':
        'kodo://goplus-builder-static-test/files/Frzj7kmqyyfOiC0qMLUWWWbtsMuv-1989',
      'assets/sprites/Samurai/__animation_default_idle-3.png':
        'kodo://goplus-builder-static-test/files/Fs0V69fiqz3F2bSgsyl-l3DAgkFZ-1994',
      'assets/sprites/Samurai/__animation_default_idle-4.png':
        'kodo://goplus-builder-static-test/files/FpMZz1bRKENz4azbIMM7Tz4AFszC-2023',
      'assets/sprites/Samurai/__animation_default_idle-5.png':
        'kodo://goplus-builder-static-test/files/FtsVK05enFwnq7t4gsAG_t2BPAPR-2014',
      'assets/sprites/Samurai/__animation_default_idle-6.png':
        'kodo://goplus-builder-static-test/files/FoP-MCkmxKE5u4NkzY1CT-86Na66-1985',
      'assets/sprites/Samurai/__animation_die_dead-1.png':
        'kodo://goplus-builder-static-test/files/FqP0to8QhEJ6q_KHSG-xLwnuJfox-1651',
      'assets/sprites/Samurai/__animation_die_dead-2.png':
        'kodo://goplus-builder-static-test/files/FmH1ocj2U5Yf9vkolJMO-yLkmQDw-1505',
      'assets/sprites/Samurai/__animation_die_dead-3.png':
        'kodo://goplus-builder-static-test/files/FigSbdRd5bq-QAGjWZ_i4CTSUEDB-1057',
      'assets/sprites/Samurai/__animation_fight_attack_1-1.png':
        'kodo://goplus-builder-static-test/files/Fh0oJdeFwgO2E4vI1sz32rV0Pw0P-1800',
      'assets/sprites/Samurai/__animation_fight_attack_1-2.png':
        'kodo://goplus-builder-static-test/files/Fl9sIL2-sOW78iSytYmkRSqm9nK5-1770',
      'assets/sprites/Samurai/__animation_fight_attack_1-3.png':
        'kodo://goplus-builder-static-test/files/Fl46Yemx7xn4BjogtaFwIhEqL2z6-1824',
      'assets/sprites/Samurai/__animation_fight_attack_1-4.png':
        'kodo://goplus-builder-static-test/files/FupHZVrhWPHPGCNFvfnz52N04M3V-1881',
      'assets/sprites/Samurai/__animation_fight_attack_1-5.png':
        'kodo://goplus-builder-static-test/files/Fi6IGob-00asBvUrlllAPMvoj8UC-2019',
      'assets/sprites/Samurai/__animation_fight_attack_1-6.png':
        'kodo://goplus-builder-static-test/files/FhD6FEaKO_RZ22jsaNKFS45CBkMv-1869',
      'assets/sprites/Samurai/__animation_walk_walk-1.png':
        'kodo://goplus-builder-static-test/files/FugQwRMUp-KATS9dT3g5-rkvpw-7-1792',
      'assets/sprites/Samurai/__animation_walk_walk-2.png':
        'kodo://goplus-builder-static-test/files/Fg-Or0cDoT0J10MAUzQnDu9fRPDB-1700',
      'assets/sprites/Samurai/__animation_walk_walk-3.png':
        'kodo://goplus-builder-static-test/files/FmLeH0Z5iLaCfI58NMCQ0MYRjBVv-1741',
      'assets/sprites/Samurai/__animation_walk_walk-4.png':
        'kodo://goplus-builder-static-test/files/FosR5Xi48mYeW4-aQay0FdnuYyuK-1752',
      'assets/sprites/Samurai/__animation_walk_walk-5.png':
        'kodo://goplus-builder-static-test/files/Fp_LMrnWGC5KdIKJq0Xil3RFXF2I-1731',
      'assets/sprites/Samurai/__animation_walk_walk-6.png':
        'kodo://goplus-builder-static-test/files/FpHgMK5VOBbve6bXFQdu9RjOWj7S-1670',
      'assets/sprites/Samurai/__animation_walk_walk-7.png':
        'kodo://goplus-builder-static-test/files/FmUnJNsLv9QoS7_B5Af6NZ_hjmwQ-1779',
      'assets/sprites/Samurai/__animation_walk_walk-8.png':
        'kodo://goplus-builder-static-test/files/FuUFH4RjyGB74ljmuys2wVf46SlK-1759',
      'assets/sprites/Samurai/default.png':
        'kodo://goplus-builder-static-test/files/Fh0oJdeFwgO2E4vI1sz32rV0Pw0P-1800',
      'assets/sprites/Samurai/index.json':
        'data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A20%2C%22y%22%3A55%2C%22size%22%3A1.89%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22default%22%2C%22path%22%3A%22default.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_fight_attack_1-1%22%2C%22path%22%3A%22__animation_fight_attack_1-1.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_fight_attack_1-2%22%2C%22path%22%3A%22__animation_fight_attack_1-2.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_fight_attack_1-3%22%2C%22path%22%3A%22__animation_fight_attack_1-3.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_fight_attack_1-4%22%2C%22path%22%3A%22__animation_fight_attack_1-4.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_fight_attack_1-5%22%2C%22path%22%3A%22__animation_fight_attack_1-5.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_fight_attack_1-6%22%2C%22path%22%3A%22__animation_fight_attack_1-6.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_die_dead-1%22%2C%22path%22%3A%22__animation_die_dead-1.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_die_dead-2%22%2C%22path%22%3A%22__animation_die_dead-2.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_die_dead-3%22%2C%22path%22%3A%22__animation_die_dead-3.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_default_idle-1%22%2C%22path%22%3A%22__animation_default_idle-1.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_default_idle-2%22%2C%22path%22%3A%22__animation_default_idle-2.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_default_idle-3%22%2C%22path%22%3A%22__animation_default_idle-3.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_default_idle-4%22%2C%22path%22%3A%22__animation_default_idle-4.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_default_idle-5%22%2C%22path%22%3A%22__animation_default_idle-5.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_default_idle-6%22%2C%22path%22%3A%22__animation_default_idle-6.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_walk_walk-1%22%2C%22path%22%3A%22__animation_walk_walk-1.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_walk_walk-2%22%2C%22path%22%3A%22__animation_walk_walk-2.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_walk_walk-3%22%2C%22path%22%3A%22__animation_walk_walk-3.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_walk_walk-4%22%2C%22path%22%3A%22__animation_walk_walk-4.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_walk_walk-5%22%2C%22path%22%3A%22__animation_walk_walk-5.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_walk_walk-6%22%2C%22path%22%3A%22__animation_walk_walk-6.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_walk_walk-7%22%2C%22path%22%3A%22__animation_walk_walk-7.png%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22__animation_walk_walk-8%22%2C%22path%22%3A%22__animation_walk_walk-8.png%22%7D%5D%2C%22fAnimations%22%3A%7B%22fight%22%3A%7B%22from%22%3A%22__animation_fight_attack_1-1%22%2C%22to%22%3A%22__animation_fight_attack_1-6%22%2C%22duration%22%3A0.6%2C%22anitype%22%3A0%7D%2C%22die%22%3A%7B%22from%22%3A%22__animation_die_dead-1%22%2C%22to%22%3A%22__animation_die_dead-3%22%2C%22duration%22%3A0.6%2C%22anitype%22%3A0%7D%2C%22default%22%3A%7B%22from%22%3A%22__animation_default_idle-1%22%2C%22to%22%3A%22__animation_default_idle-6%22%2C%22duration%22%3A0.6%2C%22anitype%22%3A0%7D%2C%22walk%22%3A%7B%22from%22%3A%22__animation_walk_walk-1%22%2C%22to%22%3A%22__animation_walk_walk-8%22%2C%22duration%22%3A0.8%2C%22anitype%22%3A0%7D%7D%2C%22defaultAnimation%22%3A%22default%22%2C%22animBindings%22%3A%7B%22die%22%3A%22die%22%2C%22step%22%3A%22walk%22%7D%7D'
    },
    filesHash: 'h1:TQPF2LZZ2o83Y5J/zK0RGpaqdkw='
  }
]

const mockJobs: Map<string, 'image' | 'sprite'> = new Map()

/**
 * Generate AI image with given keyword and category
 *
 * WARNING: This API has not been implemented yet. It will return a mock result.
 */
export async function generateAIImage({
  keyword,
  category,
  assetType,
  width,
  height
}: CreateAIImageParams) {
  return new Promise<{ imageJobId: string }>((resolve) => {
    setTimeout(() => {
      const jobId = `mock-${keyword}-${Math.random().toString(36).slice(2)}`
      mockJobs.set(jobId, 'image')
      resolve({ imageJobId: jobId })
    }, 1000)
  })
  const result = (await client.post(
    '/aigc/image',
    { keyword, category, assetType, width, height },
    { timeout: 20 * 1000 }
  )) as {
    imageJobId: string
  }
  return result
}

/**
 * Generate AI sprite from image
 *
 * @param imageJobId The image job ID given by `generateAIImage`
 *
 * WARNING: This API has not been implemented yet. It will return a mock result.
 */
export async function generateAISprite(imageJobId: string) {
  return new Promise<{ spriteJobId: string }>((resolve) => {
    setTimeout(() => {
      const jobId = mockJobs.get(imageJobId)
      if (jobId !== 'image') {
        throw new Error(`Job ${imageJobId} is not an image job`)
      }
      const spriteJobId = `mock-${imageJobId}-${Math.random().toString(36).slice(2)}`
      mockJobs.set(spriteJobId, 'sprite')
      resolve({ spriteJobId })
    }, 1000)
  })
  const result = (await client.post('/aigc/sprite', { imageJobId }, { timeout: 20 * 1000 })) as {
    spriteJobId: string
  }
  return result
}

export enum AIGCType {
  Image,
  Sprite,
  Backdrop
}

export enum AIGCStatus {
  Waiting,
  Generating,
  Finished,
  Failed
}

export type AIGCFiles = {
  imageUrl?: string
  skeletonUrl?: string
  animMeshUrl?: string
  frameDataUrl?: string
  backdropImageUrl?: string
  [key: string]: string | undefined
}

export interface AIGCStatusResponse {
  status: AIGCStatus
  result?: {
    jobId: string
    type: AIGCType
    files: AIGCFiles
  }
}

const mockAIGCStatusMap: Map<string, number> = new Map()

/**
 * Get AI image generation status
 *
 * @param jobId The job ID returned by `generateAIXxx`
 * @returns
 *
 * WARNING: This API has not been implemented yet. It will return a mock result.
 */
export async function getAIGCStatus(jobId: string) {
  return new Promise<AIGCStatusResponse>((resolve) => {
    setTimeout(() => {
      const timestamp = mockAIGCStatusMap.get(jobId)
      const random = Math.random()
      if (timestamp === undefined) {
        mockAIGCStatusMap.set(jobId, Date.now())
        resolve({ status: AIGCStatus.Waiting })
      } else if (Date.now() - timestamp < 1000 + random * 2000) {
        resolve({ status: AIGCStatus.Waiting })
      } else if (Date.now() - timestamp < 5000 + random * 5000) {
        resolve({ status: AIGCStatus.Generating })
      } else {
        const resultType = mockJobs.get(jobId)
        const result = resultType === 'image' ? 
          { imageUrl: mockAIImage.imageUri[Math.floor(random * mockAIImage.imageUri.length)] }:
          mockAISprite[Math.floor(random * mockAISprite.length)].files
        resolve({
          status: AIGCStatus.Finished,
          result: {
            jobId,
            type: AIGCType.Image,
            files: result
          }
        })
      }
    }, 300)
  })
  const result = (await client.get(
    `/aigc/status/${jobId}`,
    {},
    { timeout: 20 * 1000 }
  )) as AIGCStatusResponse
  return result
}
