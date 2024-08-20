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

/**
 * AI asset data
 * It is a subset of `AssetData`.
 */
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

/**
 * Flag to indicate the asset is an AI-generated asset.
 * It could be used to narrow down the `AssetOrAIAsset` type.
 */
export const isAiAsset = Symbol('isAiAsset')

/**
 * Flag to indicate the preview image of the asset is ready.
 */
export const isPreviewReady = Symbol('isPreviewReady')

/**
 * Flag to indicate the content of the asset is ready.
 * For sprite, it means the sprite has been generated from the preview image.
 */
export const isContentReady = Symbol('isContentReady')

/**
 * When the asset is exported, the backend will return an ID for the exported asset.
 * This ID can be used to retrieve the exported asset.
 * 
 * Store the exported ID in the asset data to prevent exporting the same asset multiple times.
 */
export const exportedId = Symbol('isExported')

/**
 * AI asset data with some additional flags and data.
 */
export type TaggedAIAssetData<T extends AssetType = AssetType> = AIAssetData<T> & {
  [isAiAsset]: true
  [isPreviewReady]: boolean
  [isContentReady]: boolean
  [exportedId]?: string
}

/**
 * Type for an public asset or an AI-generated asset.
 */
export type AssetOrAIAsset = AssetData | TaggedAIAssetData

export interface CreateAIImageParams {
  keyword: string
  category: string | string[]
  width?: number
  height?: number
}

const mockAIImage = {
  imageUri: [
    // ...
  ]
}

const mockAISprite: {
  files: AIGCFiles
  filesHash: string
}[] = [
  // ...
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
  width,
  height
}: CreateAIImageParams) {
  // return new Promise<{ imageJobId: string }>((resolve) => {
  //   setTimeout(() => {
  //     const jobId = `mock-${keyword}-${Math.random().toString(36).slice(2)}`
  //     mockJobs.set(jobId, 'image')
  //     resolve({ imageJobId: jobId })
  //   }, 1000)
  // })
  const result = (await client.post(
    '/aigc/image',
    { keyword, category, width, height },
    { timeout: 60 * 1000 }// 60s
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
  // return new Promise<AIGCStatusResponse>((resolve) => {
  //   setTimeout(() => {
  //     const timestamp = mockAIGCStatusMap.get(jobId)
  //     const random = Math.random()
  //     if (timestamp === undefined) {
  //       mockAIGCStatusMap.set(jobId, Date.now())
  //       resolve({ status: AIGCStatus.Waiting })
  //     } else if (Date.now() - timestamp < 1000 + random * 2000) {
  //       resolve({ status: AIGCStatus.Waiting })
  //     } else if (Date.now() - timestamp < 5000 + random * 5000) {
  //       resolve({ status: AIGCStatus.Generating })
  //     } else {
  //       const resultType = mockJobs.get(jobId)
  //       const result = resultType === 'image' ? 
  //         { imageUrl: mockAIImage.imageUri[Math.floor(random * mockAIImage.imageUri.length)] }:
  //         mockAISprite[Math.floor(random * mockAISprite.length)].files
  //       resolve({
  //         status: AIGCStatus.Finished,
  //         result: {
  //           jobId,
  //           type: AIGCType.Image,
  //           files: result
  //         }
  //       })
  //     }
  //   }, 300)
  // })
  const result = (await client.get(
    `/aigc/status/${jobId}`,
    {},
    { timeout: 60 * 1000 }
  )) as AIGCStatusResponse
  return result
}

/**
 * WARNING: This API is not implemented in the backend yet.
 * The parameter has not been determined yet.
 * As some ai-generated asset may be edited by user or js code, 
 * the backend may need to get the partial asset instead of the jobId.
 * 
 * This logic can use previous transfer method to export the asset,this api is not necessary.
 */
export async function exportAIGCAsset(asset: TaggedAIAssetData): Promise<{ assetId: string }>;
export async function exportAIGCAsset(jobId: string): Promise<{ assetId: string }>;
export async function exportAIGCAsset(param: any) {
  return new Promise<{ assetId: string }>((resolve) => {
    setTimeout(() => {
      resolve({ assetId: '21' })
    }, 1000)
  })
  const result = (await client.post(`/aigc/export`,
    typeof param === 'string' ? { jobId: param } : { ...param }
  )) as {
    assetId: string
  }
  return result
}
