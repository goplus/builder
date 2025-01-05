import { shallowReactive, shallowRef } from 'vue'
import { Cancelled } from './exception'

type Task<T> = {
  ctrl: AbortController
  data: T | null
  error: unknown | null
}

export class TaskManager<P extends any[], T> {
  constructor(private taskFn: (signal: AbortSignal, ...params: P) => Promise<T>) {}

  private currentTaskRef = shallowRef<Task<T> | null>(null)

  get result() {
    const { data = null, error = null } = this.currentTaskRef.value ?? {}
    return { data, error }
  }

  async start(...params: P) {
    const lastTask = this.currentTaskRef.value
    if (lastTask != null) lastTask.ctrl.abort(new Cancelled('Cancelled for new task'))

    const ctrl = new AbortController()
    const task = shallowReactive<Task<T>>({ ctrl, data: null, error: null })
    this.currentTaskRef.value = task
    try {
      const data = await this.taskFn(ctrl.signal, ...params)
      ctrl.signal.throwIfAborted()
      task.data = data
    } catch (e) {
      task.error = e
    }
  }

  stop() {
    const currentTask = this.currentTaskRef.value
    if (currentTask != null) {
      currentTask.ctrl.abort(new Cancelled('Cancelled by `stop`'))
      this.currentTaskRef.value = null
    }
  }
}
