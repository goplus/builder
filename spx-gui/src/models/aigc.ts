import { AIGCStatus, generateAIImage, generateAISprite, generateInpainting, getAIGCStatus, isAiAsset, isContentReady, isPreviewReady, syncGenerateAIImage, type AIGCFiles, type CreateAIImageParams, type GenerateInpaintingParams, type RequiredAIGCFiles, type TaggedAIAssetData } from "@/apis/aigc"
import { saveFiles } from "./common/cloud"
import { fromBlob } from "./common/file"
import { useRetryHandle } from "@/utils/exception"

type ActionFn = (...args: any[]) => Promise<any>
type PollFn<F extends ActionFn, R> = (result: Awaited<ReturnType<F>>) => Promise<R>
type WithStatus<T = {}> = T & { status: AIGCStatus }

/**
 * Task handler for AI-generated content requests, supporting synchronous and asynchronous operations.
 * 
 * @param {Function} action - Function to request AI generation.
 * @param {Array} args - Arguments for the `action`.
 * @param {Function} [pollFn] - Optional function to poll the status of AI generation.
 * 
 * - **Synchronous**: Use `action` only, leave `pollFn` empty.
 * - **Asynchronous**: Use `pollFn` to poll until completion.
 * 
 * @property {any} result - Stores the task's result.
 * @property {number} pollingInterval - Interval between polls (default adjustable).
 * @property {number} pollingLimit - Maximum polls before stopping (default adjustable).
 * 
 * @fires AIGCStatusChange - When task status changes.
 * @fires AIGCFinished - When the task completes.
 * @fires AIGCFailed - When the task fails.
 * 
 * @example Asynchronous task:
 * const task = new AIGCTask(
 *   (arg) => generateAIImage(arg),
 *   [{ keyword: 'cat', category: 'animal', assetType: AssetType.Sprite }],
 *   (result) => getAIGCStatus(result.imageJobId)
 * );
 * 
 * @example Synchronous task:
 * const task = new AIGCTask(
 *   (arg) => syncGenerateAIImage(arg),
 *   [{ keyword: 'cat', category: 'animal', assetType: AssetType.Sprite }]
 * );
 * 
 * @example Event handling:
 * task.addEventListener('AIGCStatusChange', () => {
 *   console.log('Status changed:', task.status);
 * });
 * 
 * Note: You can't use `t`(i18n) in this class.
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
    if (this._status !== value) {
      this._status = value;
      this.dispatchEvent(new CustomEvent('AIGCStatusChange', { detail: value }));
      if (value === AIGCStatus.Finished) {
        this.dispatchEvent(new CustomEvent('AIGCFinished', { detail: this.result }));
      } else if (value === AIGCStatus.Failed) {
        this.dispatchEvent(new CustomEvent('AIGCFailed', { detail: this._failureMessage }));
      }
    }
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
  }
}

export class SyncAIImageTask extends AIGCTask<TaggedAIAssetData> {
  constructor(params: CreateAIImageParams) {
    super(SyncAIImageTask.request, [params])
  }
  private static async request(params: CreateAIImageParams): Promise<TaggedAIAssetData> {
    const requestAIGC = useRetryHandle(
      async () => syncGenerateAIImage(params),
    ).fn
    const res = await requestAIGC()
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
      status: AIGCStatus.Finished,
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

export class InpaintingTask extends AIGCTask<WithStatus<{imageUrl: string}>> {
  constructor(params: GenerateInpaintingParams) {
    super(InpaintingTask.request, [params])
  }
  private static async request(params: GenerateInpaintingParams) {
    const res = await generateInpainting(params)
    return {
      imageUrl: res.image_url,
      status: AIGCStatus.Finished
    }
  }
}