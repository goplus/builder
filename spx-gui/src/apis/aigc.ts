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
  assetType: AssetType
  width?: number
  height?: number
}

/**
 * Generate AI image with given keyword and category
 *
 */
export async function generateAIImage({ keyword, category, width, height }: CreateAIImageParams) {
  const result = (await client.post(
    '/aigc/image',
    { keyword, category, width, height },
    { timeout: 60 * 1000 } // 60s
  )) as {
    imageJobId: string
  }
  return result
}

export async function syncGenerateAIImage({
  keyword,
  category,
  width,
  height
}: CreateAIImageParams) {
  const result = (await client.post(
    '/aigc/image/sync',
    { keyword, category, width, height },
    { timeout: 20 * 1000 }
  )) as {
    image_url: string
  }
  return result
}

export interface GenerateAIAnimateParams {
  imageUrl: string
  genAnimation?: boolean
  motionUrl?: string
  callbackUrl?: string
}

export interface GenerateAIAnimateResult {
  materialUrl: string
  desc: string
}

/**
 * Generate AI sprite from image
 *
 */
export async function generateAIAnimate(params: GenerateAIAnimateParams) {
  const result = (await client.post(
    '/aigc/animate',
    {
      image_url: params.imageUrl,
      gen_animation: params.genAnimation,
      motion_url: params.motionUrl,
      callback_url: params.callbackUrl
    },
    {
      timeout: 60 * 1000
    }
  )) as {
    material_url: string
    desc: string
  }
  return {
    materialUrl: result.material_url,
    desc: result.desc
  }
}

export interface GenerateInpaintingParams {
  prompt: string
  category: string
  type: number
  model_name: string
  image_url: string
  control_image_url: string
  callback_url: string
}

export interface GenerateInpaintingResult {
  image_url: string
  desc: string
}

export async function generateInpainting(params: GenerateInpaintingParams) {
  const result = (await client.post('/aigc/inpainting', params, {
    timeout: 60 * 1000
  })) as GenerateInpaintingResult
  return result
}

export interface ExtractMotionParams {
  video_url: string
  callback_url: string
}

export interface ExtractMotionResult {
  result_url: string
  desc: string
}

export async function extractMotion(params: ExtractMotionParams) {
  const result = (await client.post('/aigc/motion', params, {
    timeout: 60 * 1000
  })) as ExtractMotionResult
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

export type RequiredAIGCFiles = Required<AIGCFiles> & { [key: string]: string }

export interface AIGCStatusResponse {
  status: AIGCStatus
  result?: {
    jobId: string
    type: AIGCType
    files: AIGCFiles
  }
}

/**
 * Get AI image generation status
 *
 * @param jobId The job ID returned by `generateAIXxx`
 * @returns
 *
 */
export async function getAIGCStatus(jobId: string) {
  const result = (await client.get(
    `/aigc/status/${jobId}`,
    {},
    { timeout: 60 * 1000 }
  )) as AIGCStatusResponse
  return result
}