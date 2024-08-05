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
  // /** Asset Category */
  // category: string
  /** Asset Type */
  assetType: T
  /** Files the asset contains */
  files?: FileCollection
  /** Preview URL for the asset, e.g., a gif for a sprite */
  preview?: string
  /** Creation time */
  cTime: string
  status: AIGCStatus
}

export const AssetSourceKey = Symbol('AssetSource')
export type AssetOrAIAsset =
  | (AssetData & { [AssetSourceKey]?: 'public' })
  | (AIAssetData & { [AssetSourceKey]?: 'ai' })

export interface CreateAIImageParams {
  keyword: string
  category: string | string[]
  assetType: AssetType
  width?: number
  height?: number
}

const mockAIImage = {
  imageUri:
    'kodo://goplus-builder-static-test/files/Fr1MD9ALY59z1OQj7GlY-tKbLTjh/TotK_Ganondorf.png'
}

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
      resolve({ imageJobId: `mock-${keyword}-${Math.random().toString(36).slice(2)}` })
    }, 1000)
  })
  // const result = (await client.post(
  //   '/aigc/image',
  //   { keyword, category, assetType, width, height },
  //   { timeout: 20 * 1000 }
  // )) as {
  //   imageJobId: string
  // }
  // return result.imageJobId
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
      resolve({ spriteJobId: `mock-${imageJobId}-${Math.random().toString(36).slice(2)}` })
    }, 1000)
  })
  // const result = (await client.post('/aigc/sprite', { imageJobId }, { timeout: 20 * 1000 })) as {
  //   spriteJobId: string
  // }
  // return result.spriteJobId
}

export enum AIGCType {
  Image,
  Sprite,
  Backdrop
}

export enum AIGCStatus {
  Waiting,
  Generating,
  Finished
}

export interface AIGCStatusResponse {
  status: AIGCStatus
  result?: {
    jobId: string
    type: AIGCType
    files: {
      imageUrl?: string
      skeletonUrl?: string
      animMeshUrl?: string
      frameDataUrl?: string
      backdropImageUrl?: string
      [key: string]: string | undefined
    }
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
      if (timestamp === undefined) {
        mockAIGCStatusMap.set(jobId, Date.now())
        resolve({ status: AIGCStatus.Waiting })
      } else if (
        Date.now() - timestamp > Math.random() * 2000 &&
        Date.now() - timestamp < 5000 + Math.random() * 2000
      ) {
        resolve({ status: AIGCStatus.Generating })
      } else {
        resolve({
          status: AIGCStatus.Finished,
          result: {
            jobId,
            type: AIGCType.Image,
            files: {
              imageUrl: mockAIImage.imageUri
            }
          }
        })
      }
    }, 300)
  })
  // const result = (await client.get(
  //   `/aigc/status/${jobId}`,
  //   {},
  //   { timeout: 20 * 1000 }
  // )) as AIGCStatusResponse
  // return result
}
