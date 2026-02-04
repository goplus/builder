import { vi } from 'vitest'
import {
  AIGCAssetType,
  Facing,
  TaskEventType,
  TaskStatus,
  TaskType,
  type AnimationSettings,
  type BackdropSettings,
  type CostumeSettings,
  type ProjectSettings,
  type SpriteContentSettings,
  type SpriteSettings,
  type Task,
  type TaskParams,
  type TaskResult
} from '@/apis/aigc'
import { AnimationLoopMode, ArtStyle, BackdropCategory, Perspective, SpriteCategory } from '@/apis/common'
import * as aigcApis from '@/apis/aigc'
import { State } from '@/models/sprite.ts'

export function setupAigcMock() {
  vi.mock('@/apis/aigc', { spy: true })
}

type TaskRecord<T extends TaskType = TaskType> = {
  task: Task<T>
  params: TaskParams<T>
  result: TaskResult<T> | null
}

type MockableMethod =
  | 'enrichBackdropSettings'
  | 'enrichCostumeSettings'
  | 'enrichAnimationSettings'
  | 'enrichSpriteSettings'
  | 'genSpriteContentSettings'
  | 'createTask'
  | 'getTask'
  | 'cancelTask'
  | 'subscribeTaskEvents'

export class MockAigcApis {
  private seq = 0
  tasks = new Map<string, TaskRecord>()
  private errorInjections = new Map<MockableMethod, Error>()

  mock() {
    vi.mocked(aigcApis.enrichBackdropSettings).mockImplementation(this.enrichBackdropSettings.bind(this))
    vi.mocked(aigcApis.enrichCostumeSettings).mockImplementation(this.enrichCostumeSettings.bind(this))
    vi.mocked(aigcApis.enrichAnimationSettings).mockImplementation(this.enrichAnimationSettings.bind(this))
    vi.mocked(aigcApis.enrichSpriteSettings).mockImplementation(this.enrichSpriteSettings.bind(this))
    vi.mocked(aigcApis.genSpriteContentSettings).mockImplementation(this.genSpriteContentSettings.bind(this))
    vi.mocked(aigcApis.createTask).mockImplementation(this.createTask.bind(this))
    vi.mocked(aigcApis.getTask).mockImplementation(this.getTask.bind(this))
    vi.mocked(aigcApis.cancelTask).mockImplementation(this.cancelTask.bind(this))
    vi.mocked(aigcApis.subscribeTaskEvents).mockImplementation(this.subscribeTaskEvents.bind(this))
    vi.mocked(aigcApis.adoptAsset).mockResolvedValue()
  }

  reset() {
    this.seq = 0
    this.tasks.clear()
    this.errorInjections.clear()
  }

  async waitForTaskCount(count = 1) {
    while (this.tasks.size < count) {
      await Promise.resolve()
    }
  }

  injectErrorOnce(methodName: MockableMethod, error: Error) {
    this.errorInjections.set(methodName, error)
  }

  clearError(methodName: MockableMethod) {
    this.errorInjections.delete(methodName)
  }

  private checkAndThrowError(methodName: MockableMethod) {
    const error = this.errorInjections.get(methodName)
    if (error != null) {
      this.errorInjections.delete(methodName)
      throw error
    }
  }

  async enrichBackdropSettings(
    input: string,
    settings?: BackdropSettings,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectSettings?: ProjectSettings
  ): Promise<BackdropSettings> {
    this.checkAndThrowError('enrichBackdropSettings')
    return this.enrichAssetSettings(AIGCAssetType.Backdrop, input, settings) as BackdropSettings
  }

  async enrichCostumeSettings(
    input: string,
    settings?: CostumeSettings,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _spriteSettings?: SpriteSettings,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectSettings?: ProjectSettings
  ): Promise<CostumeSettings> {
    this.checkAndThrowError('enrichCostumeSettings')
    return this.enrichAssetSettings(AIGCAssetType.Costume, input, settings) as CostumeSettings
  }

  async enrichAnimationSettings(
    input: string,
    settings?: AnimationSettings,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _spriteSettings?: SpriteSettings,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectSettings?: ProjectSettings
  ): Promise<AnimationSettings> {
    this.checkAndThrowError('enrichAnimationSettings')
    return this.enrichAssetSettings(AIGCAssetType.Animation, input, settings) as AnimationSettings
  }

  async enrichSpriteSettings(
    input: string,
    settings?: SpriteSettings,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectSettings?: ProjectSettings
  ): Promise<SpriteSettings> {
    this.checkAndThrowError('enrichSpriteSettings')
    return this.enrichAssetSettings(AIGCAssetType.Sprite, input, settings) as SpriteSettings
  }

  async genSpriteContentSettings(settings: SpriteSettings): Promise<SpriteContentSettings> {
    this.checkAndThrowError('genSpriteContentSettings')
    return {
      costumes: [
        {
          name: 'costume-1',
          description: `A costume for ${settings.name}`,
          facing: Facing.Front,
          artStyle: ArtStyle.Unspecified,
          perspective: Perspective.Unspecified,
          referenceImageUrl: null
        },
        {
          name: 'costume-2',
          description: `Another costume for ${settings.name}`,
          facing: Facing.Front,
          artStyle: ArtStyle.Unspecified,
          perspective: Perspective.Unspecified,
          referenceImageUrl: null
        }
      ],
      animations: [
        {
          name: 'walk',
          description: `A walking animation for ${settings.name}`,
          artStyle: ArtStyle.Unspecified,
          perspective: Perspective.Unspecified,
          loopMode: AnimationLoopMode.Loopable,
          referenceFrameUrl: null
        },
        {
          name: 'jump',
          description: `A jumping animation for ${settings.name}`,
          artStyle: ArtStyle.Unspecified,
          perspective: Perspective.Unspecified,
          loopMode: AnimationLoopMode.Loopable,
          referenceFrameUrl: null
        }
      ],
      animationBindings: {
        [State.Default]: 'walk',
        [State.Die]: undefined,
        [State.Step]: 'jump',
        [State.Turn]: undefined,
        [State.Glide]: undefined
      }
    }
  }

  async createTask<T extends TaskType>(type: T, params: TaskParams<T>): Promise<Task<T>> {
    const task = this.createTaskRecord(type, params)
    return task
  }

  async getTask(taskID: string): Promise<Task> {
    const record = this.tasks.get(taskID)
    if (record == null) throw new Error(`unknown task id: ${taskID}`)
    return record.task
  }

  async cancelTask(taskID: string): Promise<Task> {
    const record = this.tasks.get(taskID)
    if (record == null) throw new Error(`unknown task id: ${taskID}`)
    if (record.task.status === TaskStatus.Pending || record.task.status === TaskStatus.Processing) {
      record.task.status = TaskStatus.Cancelling
      record.task.updatedAt = this.now()
      record.task.status = TaskStatus.Cancelled
      record.task.updatedAt = this.now()
    }
    return record.task
  }

  async *subscribeTaskEvents(taskID: string, signal?: AbortSignal): AsyncGenerator<aigcApis.TaskEvent> {
    this.checkAndThrowError('subscribeTaskEvents')
    const record = this.tasks.get(taskID)
    if (record == null) throw new Error(`unknown task id: ${taskID}`)
    if (signal?.aborted === true) return
    const task = record.task
    if (task.status === TaskStatus.Cancelling || task.status === TaskStatus.Cancelled) {
      yield { type: TaskEventType.Cancelling, data: {} }
      yield { type: TaskEventType.Cancelled, data: {} }
      return
    }
    task.status = TaskStatus.Processing
    task.updatedAt = this.now()
    yield { type: TaskEventType.Snapshot, data: task }
    if (record.result == null) record.result = this.createTaskResult(task.type, record.params)
    task.status = TaskStatus.Completed
    task.result = record.result
    task.updatedAt = this.now()
    yield { type: TaskEventType.Completed, data: { result: record.result } }
  }

  private createTaskRecord<T extends TaskType>(type: T, params: TaskParams<T>): Task<T> {
    const now = this.now()
    const id = `mock-task-${this.seq++}`
    const task: Task<T> = {
      id,
      createdAt: now,
      updatedAt: now,
      type,
      status: TaskStatus.Pending
    }
    this.tasks.set(id, { task, params, result: null })
    return task
  }

  private createTaskResult<T extends TaskType>(type: T, params: TaskParams<T>): TaskResult<T> {
    switch (type) {
      case TaskType.RemoveBackground: {
        const p = params as TaskParams<TaskType.RemoveBackground>
        return { imageUrl: this.url(`bg-removed-${this.sanitize(p.imageUrl)}`) } as TaskResult<T>
      }
      case TaskType.GenerateCostume: {
        const p = params as TaskParams<TaskType.GenerateCostume>
        const name = this.sanitize(p.settings.name)
        return {
          imageUrls: this.range(p.n).map((i) => this.url(`costume-${name}-${i + 1}.png`))
        } as TaskResult<T>
      }
      case TaskType.GenerateAnimationVideo: {
        const p = params as TaskParams<TaskType.GenerateAnimationVideo>
        const name = this.sanitize(p.settings.name)
        return { videoUrl: this.url(`animation-${name}.mp4`) } as TaskResult<T>
      }
      case TaskType.ExtractVideoFrames: {
        const p = params as TaskParams<TaskType.ExtractVideoFrames>
        const interval = p.interval ?? 200
        const count = Math.max(1, Math.floor(p.duration / interval))
        return {
          frameUrls: this.range(count).map((i) => this.url(`frame-${i + 1}.png`))
        } as TaskResult<T>
      }
      case TaskType.GenerateBackdrop: {
        const p = params as TaskParams<TaskType.GenerateBackdrop>
        const name = this.sanitize(p.settings.name)
        return {
          imageUrls: this.range(p.n).map((i) => this.url(`backdrop-${name}-${i + 1}.png`))
        } as TaskResult<T>
      }
      default:
        throw new Error(`unsupported task type: ${type as string}`)
    }
  }

  private enrichAssetSettings(
    assetType: AIGCAssetType,
    input: string,
    settings?: SpriteSettings | CostumeSettings | AnimationSettings | BackdropSettings
  ) {
    const fallbackName = this.defaultName(assetType)
    const name = settings?.name == null || settings.name.trim() === '' ? fallbackName : settings.name
    const description = input.trim() !== '' ? `Enriched description for ${input}` : settings?.description ?? ''
    const artStyle = settings?.artStyle ?? ArtStyle.Unspecified
    const perspective = settings?.perspective ?? Perspective.Unspecified
    if (assetType === AIGCAssetType.Sprite) {
      return {
        name,
        category: (settings as SpriteSettings | undefined)?.category ?? SpriteCategory.Unspecified,
        description,
        artStyle,
        perspective
      } satisfies SpriteSettings
    }
    if (assetType === AIGCAssetType.Costume) {
      return {
        name,
        description,
        facing: (settings as CostumeSettings | undefined)?.facing ?? Facing.Unspecified,
        artStyle,
        perspective,
        referenceImageUrl: null
      } satisfies CostumeSettings
    }
    if (assetType === AIGCAssetType.Animation) {
      return {
        name,
        description,
        artStyle,
        perspective,
        loopMode: (settings as AnimationSettings | undefined)?.loopMode ?? AnimationLoopMode.NonLoopable,
        referenceFrameUrl: null
      } satisfies AnimationSettings
    }
    return {
      name,
      category: (settings as BackdropSettings | undefined)?.category ?? BackdropCategory.Unspecified,
      description,
      artStyle,
      perspective
    } satisfies BackdropSettings
  }

  private defaultName(type: AIGCAssetType) {
    if (type === AIGCAssetType.Sprite) return 'EnrichedSprite'
    if (type === AIGCAssetType.Costume) return 'enriched-costume'
    if (type === AIGCAssetType.Animation) return 'enriched-animation'
    return 'enriched-backdrop'
  }

  private url(path: string) {
    return `kodo://mock-bucket/${path}`
  }

  private range(count: number) {
    return Array.from({ length: count }, (_, i) => i)
  }

  private sanitize(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, '-')
  }

  private now() {
    return new Date().toISOString()
  }
}
