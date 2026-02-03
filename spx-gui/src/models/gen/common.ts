import { ActionException, Cancelled, capture, Exception } from '@/utils/exception'
import { Disposable, mergeSignals } from '@/utils/disposable'
import type { LocaleMessage } from '@/utils/i18n'
import { ArtStyle, Perspective, SpriteCategory } from '@/apis/common'
import * as aigcApis from '@/apis/aigc'
import {
  isTerminalTaskStatus,
  TaskErrorReason,
  TaskEventType,
  TaskStatus,
  TaskType,
  type ProjectSettings,
  type SpriteSettings,
  type Task as TaskData,
  type TaskError,
  type TaskParams,
  type TaskResult
} from '@/apis/aigc'
import type { Project } from '../project'
import type { Sprite } from '../sprite'

export function getProjectSettings(project: Project): ProjectSettings {
  return {
    name: project.name ?? '',
    description: project.description ?? '',
    // TODO: consider saving inferred settings to project extraSettings?
    artStyle: project.extraSettings?.artStyle ?? inferProjectArtStyle(project),
    perspective: project.extraSettings?.perspective ?? inferProjectPerspective(project)
  }
}

/** Infers the project's art style by finding the majority art style among all sprites and backdrops. */
function inferProjectArtStyle(project: Project): ArtStyle {
  const assetArtStyles = [...project.sprites, ...project.stage.backdrops]
    .map((a) => a.assetMetadata?.extraSettings?.artStyle)
    .filter((as) => as != null)
  return majorityOf(assetArtStyles) ?? ArtStyle.Unspecified
}

/** Infers the project's perspective by finding the majority perspective among all sprites and backdrops. */
function inferProjectPerspective(project: Project): Perspective {
  const assetPerspectives = [...project.sprites, ...project.stage.backdrops]
    .map((a) => a.assetMetadata?.extraSettings?.perspective)
    .filter((p) => p != null)
  return majorityOf(assetPerspectives) ?? Perspective.Unspecified
}

export function getSpriteSettings(sprite: Sprite): SpriteSettings {
  const extraSettings = sprite.assetMetadata?.extraSettings ?? null
  return {
    name: sprite.name ?? '',
    category: (extraSettings?.category as SpriteCategory | undefined) ?? SpriteCategory.Unspecified,
    description: sprite.assetMetadata?.description ?? '',
    artStyle: extraSettings?.artStyle ?? ArtStyle.Unspecified,
    perspective: extraSettings?.perspective ?? Perspective.Unspecified
  }
}

export type PhaseState<R> =
  | {
      status: 'initial'
      result?: null
      error?: null
    }
  | {
      status: 'running'
      result?: null
      error?: null
      remaining: number | null // (estimated) remaining time in seconds
    }
  | {
      status: 'finished'
      result: R
      error?: null
    }
  | {
      status: 'failed'
      result?: null
      error: Exception
    }

/** `Phase` tracks the state of an asynchronous process. */
export class Phase<R> {
  state: PhaseState<R>
  private _timer: ReturnType<typeof setInterval> | null = null
  constructor(
    /**
     * The name of the action being tracked, used for error messages.
     * For example, "generate video" or "extract frames".
     */
    private actionName: LocaleMessage,
    /** Optional run duration (estimated) in seconds, used for providing remaining time. */
    private readonly runDuration: number | null = null
  ) {
    this.state = { status: 'initial' }
  }
  reset() {
    this.state = { status: 'initial' }
  }
  /** Tracks the state of the given promise. */
  async track(promise: Promise<R>): Promise<R> {
    this.state = { status: 'running', remaining: this.runDuration }
    this.startTimer()
    try {
      const result = await promise
      this.state = { status: 'finished', result }
      return result
    } catch (err) {
      if (err instanceof Cancelled) {
        this.state = { status: 'failed', error: err }
      } else {
        const ae = new ActionException(err, {
          zh: `${this.actionName.zh}失败`,
          en: `Failed to ${this.actionName.en}`
        })
        this.state = { status: 'failed', error: ae }
        capture(err)
      }
      throw err
    } finally {
      this.stopTimer()
    }
  }

  private startTimer() {
    if (this.runDuration == null || this.runDuration === 0) return
    const duration = this.runDuration
    // infer interval & minRemaining from runDuration
    const updateInterval = Math.round(Math.max(1, duration / 50))
    const minRemaining = updateInterval
    const startedAt = Date.now()

    if (this._timer != null) clearInterval(this._timer)
    this._timer = setInterval(() => {
      if (this.state.status !== 'running') return
      const elapsed = (Date.now() - startedAt) / 1000
      const remaining = Math.round(Math.max(minRemaining, duration - elapsed))
      this.state = { ...this.state, remaining }
    }, updateInterval * 1000)
  }

  private stopTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  /** Runs given function and tracks its state. */
  async run(fn: () => Promise<R>): Promise<R> {
    return this.track(fn())
  }
}

const taskErrorMessages: Record<TaskErrorReason, LocaleMessage> = {
  [TaskErrorReason.InvalidInput]: {
    en: 'The input provided is invalid',
    zh: '提供的输入无效'
  },
  [TaskErrorReason.ContentPolicyViolation]: {
    en: 'The generated content violates our content policy',
    zh: '生成的内容违反了我们的内容政策'
  },
  [TaskErrorReason.GenerationFailed]: {
    en: 'The content generation failed',
    zh: '内容生成失败'
  },
  [TaskErrorReason.Timeout]: {
    en: 'The content generation timed out',
    zh: '内容生成超时'
  },
  [TaskErrorReason.ServiceUnavailable]: {
    en: 'The service is currently unavailable',
    zh: '服务当前不可用'
  },
  [TaskErrorReason.InternalError]: {
    en: 'An internal error occurred',
    zh: '发生内部错误'
  }
}

export class TaskException extends Exception {
  name = 'TaskException'
  userMessage: LocaleMessage | null
  taskId: string
  reason: TaskErrorReason

  constructor(taskId: string, { message, reason }: TaskError) {
    super(`[ID=${taskId}][${reason}] ${message}`)
    this.taskId = taskId
    this.reason = reason
    this.userMessage = taskErrorMessages[reason] ?? null
  }
}

export type TaskApis = Pick<typeof aigcApis, 'createTask' | 'cancelTask' | 'subscribeTaskEvents'>

/** `Task` manages the lifecycle and state of an AIGC task. */
export class Task<T extends TaskType> extends Disposable {
  data: TaskData<T> | null

  constructor(
    private type: T,
    private apis: TaskApis = aigcApis
  ) {
    super()
    this.data = null
  }

  async untilCompleted() {
    const data = this.data
    if (data == null) throw new Error('task not started')
    if (!isTerminalTaskStatus(data.status)) {
      const ctrl = new AbortController()
      const signal = mergeSignals(this.getSignal(), ctrl.signal)
      for await (const event of this.apis.subscribeTaskEvents(data.id, signal ?? undefined)) {
        switch (event.type) {
          case TaskEventType.Snapshot:
            Object.assign<TaskData<T>, TaskData<T>>(data, event.data as TaskData<T>)
            break
          case TaskEventType.Completed:
            data.status = TaskStatus.Completed
            data.result = event.data.result as TaskResult<T>
            break
          case TaskEventType.Failed:
            data.status = TaskStatus.Failed
            data.error = event.data.error
            break
          case TaskEventType.Cancelling:
            data.status = TaskStatus.Cancelling
            break
          case TaskEventType.Cancelled:
            data.status = TaskStatus.Cancelled
            break
        }
        if (isTerminalTaskStatus(data.status)) {
          ctrl.abort()
          break
        }
      }
    }
    if (data.status === TaskStatus.Completed) return data.result!
    else if (data.status === TaskStatus.Failed) throw new TaskException(data.id, data.error!)
    else if (data.status === TaskStatus.Cancelled) throw new Cancelled('task cancelled')
    else throw new Error('unexpected task status: ' + data.status)
  }

  /** Start task with given parameters. */
  async start(params: TaskParams<T>) {
    this.tryCancel()
    const signal = this.getSignal()
    this.data = await this.apis.createTask(this.type, params, signal)
  }

  /**
   * Cancel the task if cancelable (started while not in terminal state).
   * Note:
   * - The cancellation request will not be aborted even if this task instance is disposed.
   * - No exception will be thrown even if the cancellation request fails.
   */
  async tryCancel() {
    if (this.data == null || isTerminalTaskStatus(this.data.status)) return
    const id = this.data.id
    // We are not using `this.getSignal()` here to avoid aborting the "task cancellation" request itself when task is disposed.
    // It is usual to call `dispose()` right after calling `tryCancel()` and we should not increase the burden of the caller.
    await this.apis.cancelTask(id).catch((err) => capture(err, `failed to cancel task ${id}`))
  }
}

/** Returns the majority value (appears more than half) in the array, or null if none exists. */
export function majorityOf<T>(values: T[]): T | null {
  const counts = new Map<T, number>()
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const majorityCount = Math.floor(values.length / 2) + 1
  for (const [v, count] of counts) {
    if (count >= majorityCount) {
      return v
    }
  }
  return null
}
