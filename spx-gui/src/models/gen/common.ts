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
  type ProjectSettings,
  type SpriteSettings,
  type Task as TaskData,
  type TaskError,
  type TaskParams,
  type TaskResult,
  type TaskType
} from '@/apis/aigc'
import type { Project } from '../project'
import type { Sprite } from '../sprite'

export function getProjectSettings(project: Project): ProjectSettings {
  return {
    name: project.name ?? 'TODO',
    description: project.description ?? 'TODO',
    artStyle: project.extraSettings?.artStyle ?? ArtStyle.Unspecified,
    perspective: project.extraSettings?.perspective ?? Perspective.Unspecified
  }
}

export function getSpriteSettings(sprite: Sprite): SpriteSettings {
  const extraSettings = sprite.assetMetadata?.extraSettings ?? null
  return {
    name: sprite.name ?? 'TODO',
    category: (extraSettings?.category as SpriteCategory | undefined) ?? SpriteCategory.Unspecified,
    description: sprite.assetMetadata?.description ?? 'TODO',
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
  constructor() {
    this.state = { status: 'initial' }
  }
  /** Tracks the state of the given promise. */
  async track(promise: Promise<R>): Promise<R> {
    this.state = { status: 'running' }
    try {
      const result = await promise
      this.state = { status: 'finished', result }
      return result
    } catch (err) {
      if (err instanceof Cancelled) {
        this.state = { status: 'failed', error: err }
      } else {
        const ae = new ActionException(err, {
          zh: '执行失败',
          en: 'Execution failed'
        })
        this.state = { status: 'failed', error: ae }
        capture(err)
      }
      throw err
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
  reason: TaskErrorReason

  constructor({ message, reason }: TaskError) {
    super(`[${reason}] ${message}`)
    this.reason = reason
    this.userMessage = taskErrorMessages[reason] ?? null
  }
}

export type TaskApis = Pick<typeof aigcApis, 'createTask' | 'cancelTask' | 'subscribeTaskEvents'>

/** `Task` manages the lifecycle and state of an AIGC task. */
export class Task<T extends TaskType> extends Disposable {
  private data: TaskData<T> | null

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
    else if (data.status === TaskStatus.Failed) throw new TaskException(data.error!)
    else if (data.status === TaskStatus.Cancelled) throw new Cancelled('task cancelled')
    else throw new Error('unexpected task status: ' + data.status)
  }

  /** Start task with given parameters. */
  async start(params: TaskParams<T>) {
    this.tryCancel()
    const signal = this.getSignal()
    this.data = await this.apis.createTask(this.type, params, signal)
  }

  /** Cancel the task if cancelable (started while not in terminal state). */
  async tryCancel() {
    if (this.data == null || isTerminalTaskStatus(this.data.status)) return
    return this.apis.cancelTask(this.data.id, this.getSignal())
  }
}
