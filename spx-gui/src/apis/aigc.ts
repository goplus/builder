/**
 * @desc AI-related APIs of spx-backend
 */

import type { AssetData, AssetType } from './asset'
import { client, type FileCollection } from './common'
import { fromBlob } from '@/models/common/file'
import { saveFiles } from '@/models/common/cloud'

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

export interface CreateAIImageResponse {
  image_url: string
  asset_id: string
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
    { timeout: 60 * 1000 }// may need more time
  )) as {
    image_url: string
  }
  return result
}

export async function syncGenerateAIImage({
  keyword,
  category,
  assetType,
  width,
  height
}: CreateAIImageParams) {
  return new Promise<{ image_url: string }>((resolve) => {
    setTimeout(() => {
      const imageUrl = 'https://www-static.qbox.me/_next/static/media/entry.95de67c29a4d2d3dc5339a6bd4242604.png'
      resolve({ image_url: imageUrl })
    }, 1000)
  });
  const result = (await client.post(
    '/aigc/image',
    { keyword, category, assetType, width, height },
    { timeout: 20 * 1000 }
  )) as {
    image_url: string
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

export type RequiredAIGCFiles = Required<AIGCFiles> & { [key: string]: string }

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

/**
 * WARNING: This API is not implemented in the backend yet.
 * The parameter has not been determined yet.
 * As some ai-generated asset may be edited by user or js code, 
 * the backend may need to get the partial asset instead of the jobId.
 */
export async function exportAIGCAsset(asset: TaggedAIAssetData): Promise<{ assetId: string }>;
export async function exportAIGCAsset(jobId: string): Promise<{ assetId: string }>;
export async function exportAIGCAsset(param: any) {
  // return new Promise<{ assetId: string }>((resolve) => {
  //   setTimeout(() => {
  //     resolve({ assetId: '21' })
  //   }, 1000)
  // })
  const result = (await client.post(`/aigc/export`,
    typeof param === 'string' ? { jobId: param } : { ...param }
  )) as {
    assetId: string
  }
  return result
}

type ActionFn = (...args: any[]) => Promise<any>
type PollFn<F extends ActionFn, R> = (result: Awaited<ReturnType<F>>) => Promise<R>
type WithStatus<T = {}> = T & { status: AIGCStatus }

/**
 * This is a task handler for requesting AI-generated content (and polling the status if needed).
 * 
 * - To handle synchronous AI-generation, just pass the request function as the `action` and leave the `pollFn` empty.
 * - To handle asynchronous AI-generation, pass the request function as the `action` and the poll function as the `pollFn`.
 * 
 * The result of the task will be stored in the `result` field.
 * 
 * Adjust the `pollingInterval` and `pollingLimit` to control the polling behavior.
 * 
 * @param action The action to request AI-generation
 * @param args Arguments for the `action`
 * @param pollFn A function to poll the status of the AI-generation.
 *    - if `pollFn` is not provided, the task will be considered as finished after the `action` is done.
 *    - otherwise the result of the action will be passed to the `pollFn` and the `pollFn` will be called repeatedly 
 *      to poll the status of the AI-generation. The task will be considered as finished when the status is finished.
 *    - The `pollFn` should return a promise that resolves to an object with a status field.
 * 
 * @event AIGCStatusChange The status of the task has changed.
 * @event AIGCFinished The task has finished.
 * @event AIGCFailed The task has failed.
 * 
 * @example async
 * ```ts
 * const task = new AIGCTask(
 *  (arg) => {
 *    return generateAIImage(arg) satisfies Promise<{ imageJobId: string }>
 *  }, 
 *  [{ keyword: 'cat', category: 'animal', assetType: AssetType.Sprite }], 
 *  (result: { imageJobId: string }) => {
 *    const result = getAIGCStatus(result.imageJobId) satisfies Promise<{ status: AIGCStatus, ...other fields}>
 *    // do something with the result
 *    return result
 *  })
 * ```
 * 
 * @example sync
 * ```ts
 * const task = new AIGCTask(
 * (arg) => {
 *   const result = syncGenerateAIImage(arg) satisfies { image_url: string }
 *   // do something with the result
 *   return result
 * },
 * [{ keyword: 'cat', category: 'animal', assetType: AssetType.Sprite }]
 * )
 * ```
 * 
 * @example event
 * ```ts
 * task.addEventListener('AIGCStatusChange', () => {
 *  console.log('Status changed:', task.status)
 * })
 * ```
 */
export class AIGCTask<
  T extends WithStatus = TaggedAIAssetData,
> extends EventTarget {
  private static _taskId = 0
  readonly taskId = `AIGCTask-${AIGCTask._taskId++}`
  private action: ActionFn
  private args: any[]
  private pollFn?: PollFn<typeof this.action, T>
  private actionResult?: T
  result?: T
  pollingInterval = 500
  pollingLimit = (5 * 60 * 1000) / this.pollingInterval
  private pollingCount = 0
  constructor(action: ActionFn, args: Parameters<ActionFn>, pollFn?: PollFn<ActionFn, T>) {
    super()
    this.action = action
    this.args = args
    this.pollFn = pollFn
  }

  private _status: AIGCStatus = AIGCStatus.Waiting
  get status() {
    return this._status
  }
  private set status(value: AIGCStatus) {
    this._status = value
    this.dispatchEvent(new CustomEvent('AIGCStatusChange', { detail: value }))
  }

  private _failureMessage?: string
  get failureMessage() {
    return this._failureMessage
  }

  async start() {
    if (!this.pollFn) {
      this.status = AIGCStatus.Generating
    }
    try {
      this.actionResult = await this.action(...this.args)
    }
    catch (e: any) {
      this.setFailure('message' in e ? e.message : 'Action failed')
      return
    }
    if (this.pollFn) {
      try {
        this.startPoll()
      }
      catch (e: any) {
        this.setFailure('message' in e ? e.message : 'Polling failed')
      }
    } else {
      this.setResult(this.actionResult as NonNullable<typeof this.actionResult>)
    }
  }

  private async startPoll() {
    if (!this.pollFn) {
      return
    }
    if (this.status === AIGCStatus.Finished || this.status === AIGCStatus.Failed) {
      return
    }
    if (this.pollingCount >= this.pollingLimit) {
      this.status = AIGCStatus.Failed
      this._failureMessage = 'Polling limit exceeded'
      return
    }
    this.pollingCount++
    const pollResult = (await this.pollFn(
      this.actionResult as NonNullable<typeof this.actionResult>
    )) satisfies { status: AIGCStatus }
    if (pollResult.status === AIGCStatus.Finished) {
      this.setResult(pollResult as typeof this.result)
      return
    }
    if (pollResult.status === AIGCStatus.Failed) {
      this.status = AIGCStatus.Failed
      this._failureMessage = 'Polling failed'
      return
    }
    setTimeout(() => {
      this.startPoll()
    }, this.pollingInterval)
  }

  private setResult(result: typeof this.result) {
    this.result = result
    this.status = AIGCStatus.Finished
    this.dispatchEvent(new CustomEvent('AIGCFinished', { detail: result }))
  }

  private setFailure(message: string) {
    this.status = AIGCStatus.Failed
    this._failureMessage = message
    this.dispatchEvent(new CustomEvent('AIGCFailed', { detail: message }))
  }

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
    super.addEventListener(type, callback, options)
    // Dispatch the event immediately if the status has already changed
    if (type === 'AIGCStatusChange' && this.status !== AIGCStatus.Waiting && callback) {
      const cb = typeof callback === 'function' ? callback : callback.handleEvent
      cb(new CustomEvent('AIGCStatusChange', { detail: this.status }))
    }
    if (type === 'AIGCFinished' && this.status === AIGCStatus.Finished && callback) {
      const cb = typeof callback === 'function' ? callback : callback.handleEvent
      cb(new CustomEvent('AIGCFinished', { detail: this.result }))
    }
  }
}

export class SyncAIImageTask extends AIGCTask<TaggedAIAssetData> {
  constructor(params: CreateAIImageParams) {
    super(SyncAIImageTask.request, [params])
  }
  private static async request(params: CreateAIImageParams): Promise<TaggedAIAssetData> {
    const res = await syncGenerateAIImage(params)

    // http files to kodo files
    const imageUrl = res.image_url
    const blob = await fetch(imageUrl).then(res => res.blob())
    const file = fromBlob('imageUrl', blob)
    const {fileCollection, fileCollectionHash} = await saveFiles({
      'imageUrl': file
    })
    
    return {
      id: fileCollectionHash, // or other identifier?
      assetType: params.assetType,
      cTime: new Date().toISOString(),
      status: AIGCStatus.Waiting,
      files: fileCollection,
      [isAiAsset]: true,
      [isPreviewReady]: true,
      [isContentReady]: false
    }
  }
}

export class AIImageTask extends AIGCTask<TaggedAIAssetData>{
  constructor(params: CreateAIImageParams) {
    super(AIImageTask.request, [params], async (actionResult: TaggedAIAssetData) => {
      const {status, result} = await getAIGCStatus(actionResult.id)
      return {
        ...actionResult,
        status,
        files: result?.files as Required<AIGCFiles> & { [key: string]: string },
        [isAiAsset]: true,
        [isPreviewReady]: false,
        [isContentReady]: false
      }
    })
  }
  private static async request(params: CreateAIImageParams): Promise<Partial<TaggedAIAssetData>> {
    const res = await generateAIImage(params)
    return {
      id: res.imageJobId,
      assetType: params.assetType,
      cTime: new Date().toISOString(),
      status: AIGCStatus.Waiting,
    }
  }
}


export class AISpriteTask extends AIGCTask<WithStatus<{files: RequiredAIGCFiles}>> {
  constructor(id: string) {
    super(generateAISprite, [id], async ({spriteJobId: id}: {spriteJobId: string}) => {
      const {status, result} = await getAIGCStatus(id)
      return {
        status,
        files: result?.files as RequiredAIGCFiles,
      }
    })
  }
}