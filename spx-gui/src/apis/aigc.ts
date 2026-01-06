/**
 * @desc AIGC-related APIs of spx-backend
 */

import { timeout } from '@/utils/utils'
import { AnimationLoopMode, ArtStyle, BackdropCategory, client, Perspective, SpriteCategory } from './common'

/**
 * @deprecated Use createTask() with TaskType.RemoveBackground instead
 */
export async function matting(imageUrl: string) {
  if (process.env.NODE_ENV === 'development') {
    await timeout(2000)
    return 'https://picsum.photos/400/400'
  }
  const result = (await client.post('/aigc/matting', { imageUrl }, { timeout: 20 * 1000 })) as {
    resultUrl: string
  }
  return result.resultUrl
}

export type ProjectSettings = {
  name: string
  description: string
  artStyle: ArtStyle
  perspective: Perspective
}

export type SpriteSettings = {
  name: string
  category: SpriteCategory
  description: string
  artStyle: ArtStyle
  perspective: Perspective
}

export const enum Facing {
  Front = 'front',
  Back = 'back',
  Left = 'left',
  Right = 'right',
  Unspecified = 'unspecified'
}

export type CostumeSettings = {
  name: string
  description: string
  facing: Facing
  artStyle: ArtStyle
  perspective: Perspective
  referenceImageUrl: string | null
}

export type AnimationSettings = {
  name: string
  description: string
  artStyle: ArtStyle
  perspective: Perspective
  loopMode: AnimationLoopMode
  referenceFrameUrl: string | null
}

export type BackdropSettings = {
  name: string
  category: BackdropCategory
  description: string
  artStyle: ArtStyle
  perspective: Perspective
}

export const enum TaskType {
  RemoveBackground = 'removeBackground',
  GenerateCostume = 'generateCostume',
  GenerateAnimationVideo = 'generateAnimationVideo',
  ExtractVideoFrames = 'extractVideoFrames',
  GenerateBackdrop = 'generateBackdrop'
}

export const enum TaskStatus {
  Pending = 'pending',
  Processing = 'processing',
  Cancelling = 'cancelling',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Failed = 'failed'
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === TaskStatus.Completed || status === TaskStatus.Cancelled || status === TaskStatus.Failed
}

export const enum TaskErrorReason {
  InvalidInput = 'invalidInput',
  ContentPolicyViolation = 'contentPolicyViolation',
  GenerationFailed = 'generationFailed',
  Timeout = 'timeout',
  ServiceUnavailable = 'serviceUnavailable',
  InternalError = 'internalError'
}

export type TaskError = {
  reason: TaskErrorReason
  message: string
}

export type TaskResultRemoveBackground = {
  imageUrl: string
}

export type TaskResultGenerateCostume = {
  imageUrls: string[]
}

export type TaskResultGenerateAnimationVideo = {
  videoUrl: string
}

export type TaskResultExtractVideoFrames = {
  frameUrls: string[]
}

export type TaskResultGenerateBackdrop = {
  imageUrls: string[]
}

export type TaskResult<T extends TaskType = TaskType> = {
  [TaskType.RemoveBackground]: TaskResultRemoveBackground
  [TaskType.GenerateCostume]: TaskResultGenerateCostume
  [TaskType.GenerateAnimationVideo]: TaskResultGenerateAnimationVideo
  [TaskType.ExtractVideoFrames]: TaskResultExtractVideoFrames
  [TaskType.GenerateBackdrop]: TaskResultGenerateBackdrop
}[T]

export type Task<T extends TaskType = TaskType> = {
  id: string
  createdAt: string
  updatedAt: string
  type: T
  status: TaskStatus
  result?: TaskResult<T>
  error?: TaskError
}

export type TaskParamsRemoveBackground = {
  imageUrl: string
}

export type TaskParamsGenerateCostume = {
  settings: CostumeSettings
  /** Number of costume images to generate. Defaults to 1. */
  n: number
}

export type TaskParamsGenerateAnimationVideo = {
  settings: AnimationSettings
}

export type TaskParamsExtractVideoFrames = {
  videoUrl: string
  /** Duration (in milliseconds) of the segment to extract frames from. Precision is 100ms. */
  duration: number
  /** Start time (in milliseconds) from which to extract frames. Precision is 100ms. */
  startTime?: number
  /** Interval between frames in milliseconds. Precision is 100ms. */
  interval?: number
}

export type TaskParamsGenerateBackdrop = {
  settings: BackdropSettings
  /** Number of backdrop images to generate. Defaults to 1. */
  n: number
}

export type TaskParams<T extends TaskType = TaskType> = {
  [TaskType.RemoveBackground]: TaskParamsRemoveBackground
  [TaskType.GenerateCostume]: TaskParamsGenerateCostume
  [TaskType.GenerateAnimationVideo]: TaskParamsGenerateAnimationVideo
  [TaskType.ExtractVideoFrames]: TaskParamsExtractVideoFrames
  [TaskType.GenerateBackdrop]: TaskParamsGenerateBackdrop
}[T]

export async function createTask<T extends TaskType>(
  type: T,
  params: TaskParams<T>,
  signal?: AbortSignal
): Promise<Task<T>> {
  if (process.env.NODE_ENV === 'development') {
    await timeout(1000)
    signal?.throwIfAborted()
    return {
      id: `mock-task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type,
      status: TaskStatus.Pending
    }
  }
  return client.post('/aigc/task', { type, parameters: params }, { signal }) as Promise<Task<T>>
}

export async function getTask(taskID: string, signal?: AbortSignal): Promise<Task> {
  if (process.env.NODE_ENV === 'development') {
    await timeout(500)
    signal?.throwIfAborted()
    return {
      id: taskID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: TaskType.GenerateCostume,
      status: TaskStatus.Completed,
      result: {
        imageUrls: ['https://picsum.photos/400/400']
      }
    } satisfies Task<TaskType.GenerateCostume>
  }
  return client.get(`/aigc/task/${encodeURIComponent(taskID)}`, undefined, { signal }) as Promise<Task>
}

export async function cancelTask(taskID: string, signal?: AbortSignal): Promise<Task> {
  if (process.env.NODE_ENV === 'development') {
    await timeout(500)
    signal?.throwIfAborted()
    return {
      id: taskID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: TaskType.GenerateCostume,
      status: TaskStatus.Cancelled
    }
  }
  return client.post(`/aigc/task/${encodeURIComponent(taskID)}/cancellation`, undefined, { signal }) as Promise<Task>
}

export const enum TaskEventType {
  Snapshot = 'snapshot',
  Cancelling = 'cancelling',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Failed = 'failed'
}

export type TaskEventSnapshot<T extends TaskType = TaskType> = {
  type: TaskEventType.Snapshot
  data: Task<T>
}

export type TaskEventCancelling = {
  type: TaskEventType.Cancelling
  data: Record<string, never>
}

export type TaskEventCompleted<T extends TaskType = TaskType> = {
  type: TaskEventType.Completed
  data: {
    result: TaskResult<T>
  }
}

export type TaskEventCancelled = {
  type: TaskEventType.Cancelled
  data: Record<string, never>
}

export type TaskEventFailed = {
  type: TaskEventType.Failed
  data: {
    error: TaskError
  }
}

export type TaskEvent<T extends TaskType = TaskType> =
  | TaskEventSnapshot<T>
  | TaskEventCancelling
  | TaskEventCompleted<T>
  | TaskEventCancelled
  | TaskEventFailed

export async function* subscribeTaskEvents(taskID: string, signal?: AbortSignal): AsyncGenerator<TaskEvent> {
  if (process.env.NODE_ENV === 'development') {
    signal?.throwIfAborted()

    yield {
      type: TaskEventType.Snapshot,
      data: {
        id: taskID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: TaskType.GenerateCostume,
        status: TaskStatus.Processing
      }
    }

    await timeout(2000)
    signal?.throwIfAborted()

    yield {
      type: TaskEventType.Completed,
      data: {
        result: {
          imageUrls: [
            'https://picsum.photos/400/400',
            'https://picsum.photos/400/400',
            'https://picsum.photos/400/400',
            'https://picsum.photos/400/400'
          ],
          frameUrls: [
            'https://picsum.photos/400/400',
            'https://picsum.photos/400/400',
            'https://picsum.photos/400/400'
          ],
          videoUrl: 'https://builder-usercontent-test.gopluscdn.com/videos/test-aigc/generated_video.mp4'
        }
      }
    }

    return
  }

  return client.getJSONSSE(`/aigc/task/${encodeURIComponent(taskID)}/events`, undefined, { signal })
}

// TODO: merge with `AssetType`
export const enum AIGCAssetType {
  Sprite = 'sprite',
  Costume = 'costume',
  Animation = 'animation',
  Backdrop = 'backdrop'
}

export type EnrichAssetSettingsParams = {
  assetType: AIGCAssetType
  input: string
  settings?: SpriteSettings | CostumeSettings | AnimationSettings | BackdropSettings
  spriteSettings?: SpriteSettings
  projectSettings?: ProjectSettings
}

export type EnrichAssetSettingsResult = SpriteSettings | CostumeSettings | AnimationSettings | BackdropSettings

export async function enrichAssetSettings(
  params: EnrichAssetSettingsParams,
  signal?: AbortSignal
): Promise<EnrichAssetSettingsResult> {
  if (process.env.NODE_ENV === 'development') {
    await timeout(2000)
    signal?.throwIfAborted()

    switch (params.assetType) {
      case AIGCAssetType.Sprite:
        return {
          name: 'Enriched Sprite',
          category: SpriteCategory.Character,
          description: `An enriched sprite based on: ${params.input}`,
          artStyle: ArtStyle.FlatDesign,
          perspective: Perspective.SideScrolling
        } satisfies SpriteSettings
      case AIGCAssetType.Costume:
        return {
          name: 'Enriched Costume',
          description: `An enriched costume based on: ${params.input}`,
          facing: Facing.Front,
          artStyle: ArtStyle.FlatDesign,
          perspective: Perspective.SideScrolling,
          referenceImageUrl: null
        } satisfies CostumeSettings
      case AIGCAssetType.Animation:
        return {
          name: 'Enriched Animation',
          description: `An enriched animation based on: ${params.input}`,
          artStyle: ArtStyle.FlatDesign,
          perspective: Perspective.SideScrolling,
          loopMode: AnimationLoopMode.Loopable,
          referenceFrameUrl: null
        } satisfies AnimationSettings
      case AIGCAssetType.Backdrop:
        return {
          name: 'Enriched Backdrop',
          category: BackdropCategory.Unspecified,
          description: `An enriched backdrop based on: ${params.input}`,
          artStyle: ArtStyle.FlatDesign,
          perspective: Perspective.AngledTopDown
        } satisfies BackdropSettings
    }
  }
  return client.post('/aigc/asset-settings/enrichment', params, { signal }) as Promise<EnrichAssetSettingsResult>
}

export type SpriteContentSettings = {
  costumes: CostumeSettings[]
  animations: AnimationSettings[]
}

export async function genSpriteContentSettings(
  settings: SpriteSettings,
  signal?: AbortSignal
): Promise<SpriteContentSettings> {
  if (process.env.NODE_ENV === 'development') {
    await timeout(3000)
    signal?.throwIfAborted()
    return {
      costumes: [
        {
          name: 'Costume 1',
          description: `Costume 1 for ${settings.name}`,
          facing: Facing.Front,
          artStyle: settings.artStyle,
          perspective: settings.perspective,
          referenceImageUrl: null
        },
        {
          name: 'Costume 2',
          description: `Another costume for ${settings.name}`,
          facing: Facing.Front,
          artStyle: settings.artStyle,
          perspective: settings.perspective,
          referenceImageUrl: null
        }
      ],
      animations: [
        {
          name: 'walk',
          description: `A walking animation for ${settings.name}`,
          artStyle: settings.artStyle,
          perspective: settings.perspective,
          loopMode: AnimationLoopMode.Loopable,
          referenceFrameUrl: null
        },
        {
          name: 'jump',
          description: `A jumping animation for ${settings.name}`,
          artStyle: settings.artStyle,
          perspective: settings.perspective,
          loopMode: AnimationLoopMode.NonLoopable,
          referenceFrameUrl: null
        }
      ]
    }
  }
  return client.post('/aigc/sprite/content-settings', { settings }, { signal }) as Promise<SpriteContentSettings>
}

export async function enrichBackdropSettings(
  input: string,
  settings?: BackdropSettings,
  projectSettings?: ProjectSettings,
  signal?: AbortSignal
): Promise<BackdropSettings> {
  const result = (await enrichAssetSettings(
    {
      assetType: AIGCAssetType.Backdrop,
      input,
      settings,
      projectSettings
    },
    signal
  )) as BackdropSettings
  return result
}

// TODO: Move task tracking to models for better control over cancellation, progress, etc.
async function untilTaskCompleted(taskID: string, signal?: AbortSignal): Promise<TaskResult> {
  for await (const event of subscribeTaskEvents(taskID, signal)) {
    if (event.type === TaskEventType.Completed) {
      return event.data.result
    } else if (event.type === TaskEventType.Failed) {
      throw new Error(event.data.error.message)
    }
  }
  throw new Error('No completion event received')
}

export async function genBackdropImage(settings: BackdropSettings, signal?: AbortSignal): Promise<string> {
  const task = await createTask(TaskType.GenerateBackdrop, { settings, n: 1 }, signal)
  const result = (await untilTaskCompleted(task.id, signal)) as TaskResult<TaskType.GenerateBackdrop>
  if (result.imageUrls.length < 1) throw new Error('No backdrop image generated')
  return result.imageUrls[0]
}

export async function enrichCostumeSettings(
  input: string,
  settings?: CostumeSettings,
  spriteSettings?: SpriteSettings,
  projectSettings?: ProjectSettings,
  signal?: AbortSignal
): Promise<CostumeSettings> {
  const result = (await enrichAssetSettings(
    {
      assetType: AIGCAssetType.Costume,
      input,
      settings,
      spriteSettings,
      projectSettings
    },
    signal
  )) as CostumeSettings
  return result
}

export async function enrichAnimationSettings(
  input: string,
  settings?: AnimationSettings,
  spriteSettings?: SpriteSettings,
  projectSettings?: ProjectSettings,
  signal?: AbortSignal
): Promise<AnimationSettings> {
  const result = (await enrichAssetSettings(
    {
      assetType: AIGCAssetType.Animation,
      input,
      settings,
      spriteSettings,
      projectSettings
    },
    signal
  )) as AnimationSettings
  return result
}

export async function enrichSpriteSettings(
  input: string,
  settings?: SpriteSettings,
  projectSettings?: ProjectSettings,
  signal?: AbortSignal
): Promise<SpriteSettings> {
  const result = (await enrichAssetSettings(
    {
      assetType: AIGCAssetType.Sprite,
      input,
      settings,
      projectSettings
    },
    signal
  )) as SpriteSettings
  return result
}
