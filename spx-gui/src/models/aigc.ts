import { AIGCStatus, generateAIImage, generateAISprite, getAIGCStatus, isAiAsset, isContentReady, isPreviewReady, syncGenerateAIImage, type AIGCFiles, type CreateAIImageParams, type RequiredAIGCFiles, type TaggedAIAssetData } from "@/apis/aigc"
import { saveFiles } from "./common/cloud"
import { fromBlob } from "./common/file"

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