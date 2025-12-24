/**
 * @desc AIGC-related APIs of spx-backend
 */

import { client } from './common'

/**
 * AIGC task status
 */
export type AIGCTaskStatus =
  | 'pending'
  | 'processing'
  | 'cancelling'
  | 'completed'
  | 'cancelled'
  | 'failed'

/**
 * AIGC task type
 */
export type AIGCTaskType =
  | 'removeBackground'
  | 'generateCostume'
  | 'generateAnimationVideo'
  | 'extractVideoFrames'
  | 'generateBackdrop'

/**
 * AIGC task error
 */
export interface AIGCTaskError {
  reason:
    | 'invalidInput'
    | 'contentPolicyViolation'
    | 'generationFailed'
    | 'timeout'
    | 'serviceUnavailable'
    | 'internalError'
  message: string
}

/**
 * AIGC task result types
 */
export type AIGCTaskResult =
  | { imageUrl: string } // removeBackground, generateCostume, generateBackdrop
  | { videoUrl: string } // generateAnimationVideo
  | { frameUrls: string[] } // extractVideoFrames

/**
 * AIGC task object
 */
export interface AIGCTask {
  id: string
  createdAt: string
  updatedAt: string
  type: AIGCTaskType
  status: AIGCTaskStatus
  result?: AIGCTaskResult
  error?: AIGCTaskError
}

/**
 * Parameters for removeBackground task
 */
export interface RemoveBackgroundParams {
  imageUrl: string
}

/**
 * Parameters for extractVideoFrames task
 */
export interface ExtractVideoFramesParams {
  videoUrl: string
  interval?: number // milliseconds, default 100
}

/**
 * Create an AIGC task
 */
export async function createAIGCTask<T extends AIGCTaskType>(
  type: T,
  parameters: T extends 'removeBackground'
    ? RemoveBackgroundParams
    : T extends 'extractVideoFrames'
      ? ExtractVideoFramesParams
      : Record<string, unknown>
): Promise<AIGCTask> {
  const result = await client.post('/aigc/task', { type, parameters })
  return result as AIGCTask
}

/**
 * Get AIGC task status
 */
export async function getAIGCTask(taskID: string): Promise<AIGCTask> {
  const result = await client.get(`/aigc/task/${taskID}`)
  return result as AIGCTask
}

/**
 * Cancel an AIGC task
 */
export async function cancelAIGCTask(taskID: string): Promise<AIGCTask> {
  const result = await client.post(`/aigc/task/${taskID}/cancellation`, {})
  return result as AIGCTask
}

/**
 * Remove image background (deprecated, use createAIGCTask with type 'removeBackground' instead)
 * @deprecated Use createAIGCTask with type 'removeBackground' for better reliability
 */
export async function matting(imageUrl: string) {
  const result = (await client.post('/aigc/matting', { imageUrl }, { timeout: 20 * 1000 })) as {
    resultUrl: string
  }
  return result.resultUrl
}
