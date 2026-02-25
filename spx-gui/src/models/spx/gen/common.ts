import { ActionException, Cancelled, capture, Exception } from '@/utils/exception'
import { Disposable, mergeSignals } from '@/utils/disposable'
import type { LocaleMessage } from '@/utils/i18n'
import { ProgressReporter } from '@/utils/progress'
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
import type { SpxProject } from '../project'
import type { Sprite } from '../sprite'

export function getProjectSettings(project: SpxProject): ProjectSettings {
  return {
    name: project.name ?? '',
    description: project.description ?? '',
    // TODO: consider saving inferred settings to project extraSettings?
    artStyle: project.extraSettings?.artStyle ?? inferProjectArtStyle(project),
    perspective: project.extraSettings?.perspective ?? inferProjectPerspective(project)
  }
}

/** Infers the project's art style by finding the majority art style among all sprites and backdrops. */
function inferProjectArtStyle(project: SpxProject): ArtStyle {
  const assetArtStyles = [...project.sprites, ...project.stage.backdrops]
    .map((a) => a.assetMetadata?.extraSettings?.artStyle)
    .filter((as) => as != null)
  return majorityOf(assetArtStyles) ?? ArtStyle.Unspecified
}

/** Infers the project's perspective by finding the majority perspective among all sprites and backdrops. */
function inferProjectPerspective(project: SpxProject): Perspective {
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
      timeLeft?: null
    }
  | {
      status: 'running'
      result?: null
      error?: null
      /** Estimated time left in milliseconds, derived from task progress reports. `null` if unknown. */
      timeLeft: number | null
    }
  | {
      status: 'finished'
      result: R
      error?: null
      timeLeft?: null
    }
  | {
      status: 'failed'
      result?: null
      error: Exception
      timeLeft?: null
    }

// Note: it's not the Phase's responsibility to ensure the `result` in state is serializable.
// The caller should handle the serialization when necessary.
export type PhaseSerialized<R> = {
  state: PhaseState<R>
  actionName: LocaleMessage
}

/** Maps the `result` in given serialized `Phase` using the given function. */
export function mapPhaseResult<R, T>(serialized: PhaseSerialized<R>, fn: (input: R) => T): PhaseSerialized<T> {
  const { state, actionName } = serialized
  if (state.status !== 'finished') return { state, actionName }
  return { state: { ...state, result: fn(state.result) }, actionName }
}

/** `Phase` tracks the state of an asynchronous process. */
export class Phase<R> {
  constructor(
    /**
     * The name of the action being tracked, used for error messages.
     * For example, "generate video" or "extract frames".
     */
    private actionName: LocaleMessage,
    public state: PhaseState<R> = { status: 'initial' }
  ) {}
  reset() {
    this.state = { status: 'initial' }
  }
  private async _track(promise: Promise<R>): Promise<R> {
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
    }
  }

  /** Tracks the state of the given promise without progress reporting. */
  async track(promise: Promise<R>): Promise<R> {
    this.state = { status: 'running', timeLeft: null }
    return this._track(promise)
  }

  /**
   * Runs given function and tracks its state.
   * The function receives a `ProgressReporter` which updates `state.timeLeft`.
   */
  async run(fn: (reporter: ProgressReporter) => Promise<R>): Promise<R> {
    const reporter = new ProgressReporter((p) => {
      if (this.state.status === 'running' && p.timeLeft != null) {
        // Mutate the existing state object to avoid triggering unnecessary reactivity
        this.state.timeLeft = p.timeLeft
      }
    })
    this.state = { status: 'running', timeLeft: null }
    return this._track(fn(reporter))
  }

  static load<R>(serialized: PhaseSerialized<R>): Phase<R> {
    return new Phase(serialized.actionName, serialized.state)
  }

  export(): PhaseSerialized<R> {
    let { state, actionName } = this
    if (
      // It is complex to serialize the error (exception) object, so we choose not to save the failed state.
      // Using `initial` state instead to allow users to retry the action.
      state.status === 'failed' ||
      // We also opt not to save the running state, as it is not feasible for Phase to resume the running process (for example, calling an API).
      // Instead, we save it as the `initial` state, allowing the caller to determine whether to recover the process,
      // which will then set the phase state back to `running`.
      state.status === 'running'
    ) {
      state = { status: 'initial' }
    }
    return { state, actionName }
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

/** Estimated duration (in seconds) for each task type. null means duration is unknown. */
export const taskDurations: Record<TaskType, number> = {
  [TaskType.RemoveBackground]: 5,
  [TaskType.GenerateCostume]: 15,
  [TaskType.GenerateAnimationVideo]: 150,
  [TaskType.ExtractVideoFrames]: 12,
  [TaskType.GenerateBackdrop]: 15
}

export type TaskApis = Pick<typeof aigcApis, 'createTask' | 'cancelTask' | 'subscribeTaskEvents'>

export type TaskSerialized<T extends TaskType> = {
  type: T
  data: TaskData<T> | null
}

/** `Task` manages the lifecycle and state of an AIGC task. */
export class Task<T extends TaskType> extends Disposable {
  constructor(
    private type: T,
    public data: TaskData<T> | null = null,
    private apis: TaskApis = aigcApis
  ) {
    super()
  }

  async untilCompleted(reporter?: ProgressReporter) {
    const data = this.data
    if (data == null) throw new Error('task not started')
    if (reporter != null && !isTerminalTaskStatus(data.status)) {
      const elapsed = Date.now() - new Date(data.createdAt).getTime()
      const taskDurationMs = taskDurations[this.type] * 1000
      const timeLeft = Math.max(1000, taskDurationMs - elapsed)
      // startAutoReport reports percentage: 0 synchronously, so Phase.run sets state.timeLeft immediately
      reporter.startAutoReport(timeLeft)
    }
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
    reporter?.report(1)
    if (data.status === TaskStatus.Completed) return data.result!
    else if (data.status === TaskStatus.Failed) throw new TaskException(data.id, data.error!)
    else if (data.status === TaskStatus.Cancelled) throw new Cancelled('task cancelled')
    else throw new Error('unexpected task status: ' + data.status)
  }

  /** Start task with given parameters. */
  async start(params: TaskParams<T>) {
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

  static load<T extends TaskType>(serialized: TaskSerialized<T>, apis: TaskApis = aigcApis): Task<T> {
    return new Task(serialized.type, serialized.data, apis)
  }

  export(): TaskSerialized<T> {
    return { type: this.type, data: this.data }
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
