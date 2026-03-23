import { vi } from 'vitest'
import {
  AIGCAssetType,
  Facing,
  TaskEventType,
  TaskErrorReason,
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
import { State } from '@/models/spx/sprite'

export function setupAigcMock(): MockAigcApis {
  vi.mock('@/apis/aigc', { spy: true })
  const mock = new MockAigcApis()
  mock.mock()
  return mock
}

type TaskRecord<T extends TaskType = TaskType> = {
  task: Task<T>
  params: TaskParams<T>
  result: TaskResult<T> | null
  subscribers: Set<TaskSubscriber>
}

type TaskSubscriber = {
  queue: aigcApis.TaskEvent[]
  resolver: (() => void) | null
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

export type TaskHandler<T extends TaskType = TaskType> = (
  task: Task<T>,
  params: TaskParams<T>,
  defaultHandler: () => AsyncGenerator<aigcApis.TaskEvent<T>>
) => AsyncGenerator<aigcApis.TaskEvent<T>>

/**
 * Mock implementation of `@/apis/aigc` for testing.
 *
 * Usage:
 * ```typescript
 * import { setupAigcMock } from './aigc-mock'
 * import { SomeModule } from './some-module' // modules that depend on @/apis/aigc
 *
 * const aigcMock = setupAigcMock()
 * ```
 *
 * IMPORTANT: `setupAigcMock()` must be called from a module that is imported
 * BEFORE any module that transitively imports `@/apis/aigc`. Vitest hoists
 * `vi.mock` calls to the top of each file, but the hoisting only affects
 * the module resolution order within that file's dependency graph. If a
 * module that depends on `@/apis/aigc` is imported before `setupAigcMock()`
 * is reached, it may receive a separate (unmocked) module instance, causing
 * `mock()` to have no effect on that instance.
 *
 * In practice, always place the `import ... from './aigc-mock'` line before
 * any imports of modules under test (e.g., `./common`, `./costume-gen`).
 */
export class MockAigcApis {
  private seq = 0
  tasks = new Map<string, TaskRecord>()
  private errorInjections = new Map<MockableMethod, Error>()
  private taskHandlers = new Map<TaskType, TaskHandler>()

  mock() {
    this.enrichBackdropSettings = vi.fn(this.enrichBackdropSettings.bind(this))
    vi.mocked(aigcApis.enrichBackdropSettings).mockImplementation(this.enrichBackdropSettings)
    this.enrichCostumeSettings = vi.fn(this.enrichCostumeSettings.bind(this))
    vi.mocked(aigcApis.enrichCostumeSettings).mockImplementation(this.enrichCostumeSettings)
    this.enrichAnimationSettings = vi.fn(this.enrichAnimationSettings.bind(this))
    vi.mocked(aigcApis.enrichAnimationSettings).mockImplementation(this.enrichAnimationSettings)
    this.enrichSpriteSettings = vi.fn(this.enrichSpriteSettings.bind(this))
    vi.mocked(aigcApis.enrichSpriteSettings).mockImplementation(this.enrichSpriteSettings)
    this.genSpriteContentSettings = vi.fn(this.genSpriteContentSettings.bind(this))
    vi.mocked(aigcApis.genSpriteContentSettings).mockImplementation(this.genSpriteContentSettings)
    // `as` preserve the generic method signature because vi.fn widens it to Task<TaskType>.
    this.createTask = vi.fn(this.createTask.bind(this)) as typeof this.createTask
    vi.mocked(aigcApis.createTask).mockImplementation(this.createTask)
    this.getTask = vi.fn(this.getTask.bind(this))
    vi.mocked(aigcApis.getTask).mockImplementation(this.getTask)
    this.cancelTask = vi.fn(this.cancelTask.bind(this))
    vi.mocked(aigcApis.cancelTask).mockImplementation(this.cancelTask)
    this.subscribeTaskEvents = vi.fn(this.subscribeTaskEvents.bind(this))
    vi.mocked(aigcApis.subscribeTaskEvents).mockImplementation(this.subscribeTaskEvents)
    vi.mocked(aigcApis.adoptAsset).mockResolvedValue()
  }

  reset() {
    this.seq = 0
    this.tasks.clear()
    this.errorInjections.clear()
    this.taskHandlers.clear()
    vi.clearAllMocks()
  }

  registerTaskHandler<T extends TaskType>(type: T, handler: TaskHandler<T>) {
    this.taskHandlers.set(type, handler as unknown as TaskHandler)
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
    _projectSettings?: ProjectSettings,
    _lang?: aigcApis.Lang
  ): Promise<BackdropSettings> {
    this.checkAndThrowError('enrichBackdropSettings')
    return this.enrichAssetSettings(AIGCAssetType.Backdrop, input, settings) as BackdropSettings
  }

  async enrichCostumeSettings(
    input: string,
    settings?: CostumeSettings,
    _spriteSettings?: SpriteSettings,
    _projectSettings?: ProjectSettings,
    _lang?: aigcApis.Lang
  ): Promise<CostumeSettings> {
    this.checkAndThrowError('enrichCostumeSettings')
    return this.enrichAssetSettings(AIGCAssetType.Costume, input, settings) as CostumeSettings
  }

  async enrichAnimationSettings(
    input: string,
    settings?: AnimationSettings,
    _spriteSettings?: SpriteSettings,
    _projectSettings?: ProjectSettings,
    _lang?: aigcApis.Lang
  ): Promise<AnimationSettings> {
    this.checkAndThrowError('enrichAnimationSettings')
    return this.enrichAssetSettings(AIGCAssetType.Animation, input, settings) as AnimationSettings
  }

  async enrichSpriteSettings(
    input: string,
    settings?: SpriteSettings,
    _projectSettings?: ProjectSettings,
    _lang?: aigcApis.Lang
  ): Promise<SpriteSettings> {
    this.checkAndThrowError('enrichSpriteSettings')
    return this.enrichAssetSettings(AIGCAssetType.Sprite, input, settings) as SpriteSettings
  }

  async genSpriteContentSettings(settings: SpriteSettings, _lang?: aigcApis.Lang): Promise<SpriteContentSettings> {
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
        [State.Step]: 'jump'
      }
    }
  }

  async createTask<T extends TaskType>(type: T, params: TaskParams<T>): Promise<Task<T>> {
    const task = this.createTaskRecord(type, params)
    queueMicrotask(() => {
      void this.processTask(task.id)
    })
    return this.cloneTask(task)
  }

  async getTask(taskID: string): Promise<Task> {
    const record = this.tasks.get(taskID)
    if (record == null) throw new Error(`unknown task id: ${taskID}`)
    return this.cloneTask(record.task)
  }

  async cancelTask(taskID: string): Promise<Task> {
    const record = this.tasks.get(taskID)
    if (record == null) throw new Error(`unknown task id: ${taskID}`)
    if (record.task.status === TaskStatus.Pending || record.task.status === TaskStatus.Processing) {
      this.handleEvent(record, { type: TaskEventType.Cancelling, data: {} })
      this.handleEvent(record, { type: TaskEventType.Cancelled, data: {} })
    }
    return this.cloneTask(record.task)
  }

  async *subscribeTaskEvents(taskID: string, signal?: AbortSignal): AsyncGenerator<aigcApis.TaskEvent> {
    this.checkAndThrowError('subscribeTaskEvents')
    const record = this.tasks.get(taskID)
    if (record == null) throw new Error(`unknown task id: ${taskID}`)
    if (signal?.aborted === true) return

    const subscriber: TaskSubscriber = { queue: [], resolver: null }
    record.subscribers.add(subscriber)
    // First emit current snapshot to simulate subscribing to latest server-side status.
    subscriber.queue.push({ type: TaskEventType.Snapshot, data: this.cloneTask(record.task) })

    const wake = () => {
      if (subscriber.resolver != null) {
        const resolve = subscriber.resolver
        subscriber.resolver = null
        resolve()
      }
    }
    const onAbort = () => {
      wake()
    }
    signal?.addEventListener('abort', onAbort)

    try {
      while (!signal?.aborted) {
        if (subscriber.queue.length === 0) {
          await new Promise<void>((resolve) => {
            subscriber.resolver = resolve
          })
          continue
        }
        const event = subscriber.queue.shift()
        if (event == null) continue
        yield event
      }
    } finally {
      signal?.removeEventListener('abort', onAbort)
      record.subscribers.delete(subscriber)
    }
  }

  private async processTask(taskID: string) {
    const record = this.tasks.get(taskID)
    if (record == null) return
    const task = record.task
    const defaultHandler = this.defaultTaskHandler.bind(this, record)

    try {
      const handler = this.taskHandlers.get(task.type)
      const events = handler != null ? handler(task, record.params, defaultHandler) : defaultHandler()
      for await (const event of events) {
        // Stop processing if task is already terminal due to external cancellation.
        if (
          task.status === TaskStatus.Cancelled ||
          task.status === TaskStatus.Failed ||
          task.status === TaskStatus.Completed
        )
          break
        this.handleEvent(record, event)
      }
    } catch (error) {
      if (task.status === TaskStatus.Cancelled) return
      const failedEvent: aigcApis.TaskEventFailed = {
        type: TaskEventType.Failed,
        data: {
          error: {
            message: error instanceof Error ? error.message : String(error),
            reason: TaskErrorReason.InternalError
          }
        }
      }
      this.handleEvent(record, failedEvent)
    }
  }

  private async *defaultTaskHandler(record: TaskRecord): AsyncGenerator<aigcApis.TaskEvent> {
    const task = record.task
    if (task.status === TaskStatus.Cancelling || task.status === TaskStatus.Cancelled) {
      yield { type: TaskEventType.Cancelling, data: {} }
      yield { type: TaskEventType.Cancelled, data: {} }
      return
    }
    yield {
      type: TaskEventType.Snapshot,
      data: {
        ...task,
        status: TaskStatus.Processing,
        updatedAt: this.now()
      }
    }
    if (record.result == null) record.result = this.createTaskResult(task.type, record.params)
    yield {
      type: TaskEventType.Completed,
      data: { result: record.result }
    }
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
    this.tasks.set(id, { task, params, result: null, subscribers: new Set() })
    return task
  }

  private cloneTask<T extends TaskType>(task: Task<T>): Task<T> {
    return {
      ...task,
      result: task.result == null ? task.result : ({ ...task.result } as TaskResult<T>),
      error: task.error == null ? task.error : { ...task.error }
    }
  }

  private handleEvent(record: TaskRecord, event: aigcApis.TaskEvent) {
    const task = record.task
    switch (event.type) {
      case TaskEventType.Snapshot:
        Object.assign(task, event.data)
        break
      case TaskEventType.Cancelling:
        task.status = TaskStatus.Cancelling
        task.updatedAt = this.now()
        break
      case TaskEventType.Cancelled:
        task.status = TaskStatus.Cancelled
        task.updatedAt = this.now()
        break
      case TaskEventType.Completed:
        task.status = TaskStatus.Completed
        task.result = event.data.result
        record.result = event.data.result
        task.updatedAt = this.now()
        break
      case TaskEventType.Failed:
        task.status = TaskStatus.Failed
        task.error = event.data.error
        task.updatedAt = this.now()
        break
    }

    const emitted = this.cloneEvent(event)
    for (const subscriber of record.subscribers) {
      subscriber.queue.push(emitted)
      if (subscriber.resolver != null) {
        const resolve = subscriber.resolver
        subscriber.resolver = null
        resolve()
      }
    }
  }

  private cloneEvent<T extends TaskType>(event: aigcApis.TaskEvent<T>): aigcApis.TaskEvent<T> {
    switch (event.type) {
      case TaskEventType.Snapshot:
        return {
          type: TaskEventType.Snapshot,
          data: this.cloneTask(event.data)
        } as aigcApis.TaskEvent<T>
      case TaskEventType.Completed:
        return {
          type: TaskEventType.Completed,
          data: {
            result: { ...event.data.result }
          }
        } as aigcApis.TaskEvent<T>
      case TaskEventType.Failed:
        return {
          type: TaskEventType.Failed,
          data: {
            error: { ...event.data.error }
          }
        } as aigcApis.TaskEvent<T>
      case TaskEventType.Cancelling:
        return { type: TaskEventType.Cancelling, data: {} } as aigcApis.TaskEvent<T>
      case TaskEventType.Cancelled:
        return { type: TaskEventType.Cancelled, data: {} } as aigcApis.TaskEvent<T>
    }
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
