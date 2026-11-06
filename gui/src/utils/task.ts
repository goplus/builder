import { shallowRef } from 'vue'
import { Cancelled, capture } from './exception'

export class TaskManager<P extends any[], T> {
  constructor(
    private taskFn: (signal: AbortSignal, ...params: P) => Promise<T>,
    /**
     * Whether to preserve last result data when a new task is started.
     * If true, the result data of the last successful task will be kept until the new task completes.
     * If false, the result data will be reset when a new task is started.
     */
    private preserveLastData = false
  ) {}

  private currentTaskCtrl: AbortController | null = null
  private dataRef = shallowRef<T | null>(null)
  private errorRef = shallowRef<unknown | null>(null)

  get result(): { data: T | null; error: unknown | null } {
    return {
      data: this.dataRef.value,
      error: this.errorRef.value
    }
  }

  async start(...params: P) {
    if (this.currentTaskCtrl != null) this.currentTaskCtrl.abort(new Cancelled('new task'))

    const ctrl = new AbortController()
    this.currentTaskCtrl = ctrl
    if (!this.preserveLastData) this.dataRef.value = null
    this.errorRef.value = null
    try {
      const data = await this.taskFn(ctrl.signal, ...params)
      ctrl.signal.throwIfAborted()
      this.dataRef.value = data
      this.errorRef.value = null
    } catch (e) {
      if (e instanceof Cancelled) return
      capture(e, 'Task failed')
      this.dataRef.value = null
      this.errorRef.value = e
    }
  }

  stop() {
    const currentTaskCtrl = this.currentTaskCtrl
    if (currentTaskCtrl != null) {
      currentTaskCtrl.abort(new Cancelled('stop'))
      this.currentTaskCtrl = null
    }
    if (!this.preserveLastData) this.dataRef.value = null
    this.errorRef.value = null
  }
}
