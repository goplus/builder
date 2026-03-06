/**
 * @desc AIGC-related APIs of spx-backend
 */

import {
  AnimationLoopMode,
  ArtStyle,
  BackdropCategory,
  client,
  type FileCollection,
  Perspective,
  SpriteCategory,
  type UniversalUrl
} from './common'
import type { AssetExtraSettings, AssetType } from './asset'
// TODO: avoid dep from apis to models
import type { State } from '@/models/spx/sprite'

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
  referenceImageUrl: UniversalUrl | null
}

export type AnimationSettings = {
  name: string
  description: string
  artStyle: ArtStyle
  perspective: Perspective
  loopMode: AnimationLoopMode
  referenceFrameUrl: UniversalUrl | null
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
  imageUrl: UniversalUrl
}

export type TaskResultGenerateCostume = {
  imageUrls: UniversalUrl[]
}

export type TaskResultGenerateAnimationVideo = {
  videoUrl: UniversalUrl
}

export type TaskResultExtractVideoFrames = {
  frameUrls: UniversalUrl[]
}

export type TaskResultGenerateBackdrop = {
  imageUrls: UniversalUrl[]
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
  /**
   * URL of the image to remove background from.
   * Now supports images in format: JPEG, JPG, PNG, BMP, WEBP.
   */
  imageUrl: UniversalUrl
}

export const taskRemoveBackgroundSupportedImgExts = ['jpeg', 'jpg', 'png', 'bmp', 'webp']

export type TaskParamsGenerateCostume = {
  settings: CostumeSettings
  /** Number of costume images to generate. Defaults to 1. */
  n: number
}

export type TaskParamsGenerateAnimationVideo = {
  settings: AnimationSettings
}

export type TaskParamsExtractVideoFrames = {
  videoUrl: UniversalUrl
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

export function createTask<T extends TaskType>(type: T, params: TaskParams<T>, signal?: AbortSignal): Promise<Task<T>> {
  return client.post('/aigc/task', { type, parameters: params }, { signal }) as Promise<Task<T>>
}

export function getTask(taskID: string, signal?: AbortSignal): Promise<Task> {
  return client.get(`/aigc/task/${encodeURIComponent(taskID)}`, undefined, { signal }) as Promise<Task>
}

export function cancelTask(taskID: string, signal?: AbortSignal): Promise<Task> {
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

export function subscribeTaskEvents(taskID: string, signal?: AbortSignal): AsyncGenerator<TaskEvent> {
  return client.getJSONSSE(`/aigc/task/${encodeURIComponent(taskID)}/events`, undefined, {
    signal
  }) as AsyncGenerator<TaskEvent>
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

export function enrichAssetSettings(
  params: EnrichAssetSettingsParams,
  signal?: AbortSignal
): Promise<EnrichAssetSettingsResult> {
  return client.post('/aigc/asset-settings/enrichment', params, {
    signal,
    timeout: 60 * 1000
  }) as Promise<EnrichAssetSettingsResult>
}

export type SpriteContentSettings = {
  costumes: CostumeSettings[]
  animations: AnimationSettings[]
  animationBindings: Partial<Record<State, string>>
}

export function genSpriteContentSettings(
  settings: SpriteSettings,
  signal?: AbortSignal
): Promise<SpriteContentSettings> {
  return client.post(
    '/aigc/sprite/content-settings',
    { settings },
    { signal, timeout: 60 * 1000 }
  ) as Promise<SpriteContentSettings>
}

export function enrichBackdropSettings(
  input: string,
  settings?: BackdropSettings,
  projectSettings?: ProjectSettings,
  signal?: AbortSignal
): Promise<BackdropSettings> {
  return enrichAssetSettings(
    {
      assetType: AIGCAssetType.Backdrop,
      input,
      settings,
      projectSettings
    },
    signal
  ) as Promise<BackdropSettings>
}

export function enrichCostumeSettings(
  input: string,
  settings?: CostumeSettings,
  spriteSettings?: SpriteSettings,
  projectSettings?: ProjectSettings,
  signal?: AbortSignal
): Promise<CostumeSettings> {
  return enrichAssetSettings(
    {
      assetType: AIGCAssetType.Costume,
      input,
      settings,
      spriteSettings,
      projectSettings
    },
    signal
  ) as Promise<CostumeSettings>
}

export function enrichAnimationSettings(
  input: string,
  settings?: AnimationSettings,
  spriteSettings?: SpriteSettings,
  projectSettings?: ProjectSettings,
  signal?: AbortSignal
): Promise<AnimationSettings> {
  return enrichAssetSettings(
    {
      assetType: AIGCAssetType.Animation,
      input,
      settings,
      spriteSettings,
      projectSettings
    },
    signal
  ) as Promise<AnimationSettings>
}

export function enrichSpriteSettings(
  input: string,
  settings?: SpriteSettings,
  projectSettings?: ProjectSettings,
  signal?: AbortSignal
): Promise<SpriteSettings> {
  return enrichAssetSettings(
    {
      assetType: AIGCAssetType.Sprite,
      input,
      settings,
      projectSettings
    },
    signal
  ) as Promise<SpriteSettings>
}

export type AssetAdoptionParams = {
  taskIds: string[]
  asset: {
    displayName: string
    type: AssetType
    description: string
    extraSettings: AssetExtraSettings
    filesHash?: string
    files: FileCollection
  }
}

export function adoptAsset(params: AssetAdoptionParams, signal?: AbortSignal) {
  return client.post('/aigc/asset-adoption', params, { signal }) as Promise<void>
}
