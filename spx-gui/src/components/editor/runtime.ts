import { effectScope, ref, shallowRef, watch } from 'vue'
import Emitter from '@/utils/emitter'
import { until } from '@/utils/utils'
import type { SpxProject } from '@/models/spx/project'
import type { TextDocumentRange } from './code-editor/xgo-code-editor'

export type RunningState =
  | {
      /** Not running */
      mode: 'none'
    }
  | {
      /** Debugging */
      mode: 'debug'
      /** Initializing for debug */
      initializing: boolean
      /** Error occurred during initializing, if any */
      initializingError?: unknown
    }

export enum RuntimeOutputKind {
  Error = 'error',
  Log = 'log'
}

export interface RuntimeOutput {
  id: number
  kind: RuntimeOutputKind
  /** Timestamp in milliseconds */
  time: number
  message: string
  source?: TextDocumentRange
}

export type RuntimeOutputInput = Omit<RuntimeOutput, 'id'>

export class Runtime extends Emitter<{
  didChangeOutput: void
  didExit: number
}> {
  static readonly defaultMaxOutputs = 500
  static readonly maxMaxOutputs = 10_000
  static readonly outputChangeEventThrottleMs = 16

  private runningRef = shallowRef<RunningState>({ mode: 'none' })
  private filesHashRef = ref<string | null>(null)
  private maxOutputsRef = ref(Runtime.defaultMaxOutputs)
  private outputsRef = shallowRef<RuntimeOutput[]>([])

  get running() {
    return this.runningRef.value
  }

  get filesHash() {
    return this.filesHashRef.value
  }

  get maxOutputs() {
    return this.maxOutputsRef.value
  }

  /** Public output snapshot, updated together with `didChangeOutput` for batched UI consumption. */
  get outputs(): readonly RuntimeOutput[] {
    return this.outputsRef.value
  }

  setRunning(running: RunningState, filesHash?: string) {
    this.runningRef.value = running
    if (running.mode === 'debug' && !running.initializing && running.initializingError == null) {
      const nextHash = filesHash ?? this.filesHash
      if (nextHash == null) throw new Error('filesHash is required when running in debug mode')
      this.filesHashRef.value = nextHash
    }
  }

  private nextOutputId = 0
  private outputRing: Array<RuntimeOutput | null> = []
  private outputHead = 0
  private outputCount = 0
  private outputChangeEventTimer: ReturnType<typeof setTimeout> | null = null

  private syncOutputs() {
    const outputs: RuntimeOutput[] = []
    for (let i = 0; i < this.outputCount; i++) {
      const idx = (this.outputHead + i) % this.maxOutputs
      const output = this.outputRing[idx]
      if (output != null) outputs.push(output)
    }
    this.outputsRef.value = outputs
  }

  private flushDidChangeOutput() {
    this.outputChangeEventTimer = null
    this.syncOutputs()
    this.emit('didChangeOutput')
  }

  private emitDidChangeOutput({ immediate = false }: { immediate?: boolean } = {}) {
    if (immediate) {
      if (this.outputChangeEventTimer != null) {
        clearTimeout(this.outputChangeEventTimer)
        this.outputChangeEventTimer = null
      }
      this.flushDidChangeOutput()
      return
    }
    if (this.outputChangeEventTimer != null) return
    this.outputChangeEventTimer = setTimeout(() => this.flushDidChangeOutput(), Runtime.outputChangeEventThrottleMs)
  }

  private getRecentOutputs(limit: number) {
    const count = Math.min(limit, this.outputCount)
    const outputs: RuntimeOutput[] = []
    for (let i = this.outputCount - count; i < this.outputCount; i++) {
      const idx = (this.outputHead + i) % this.maxOutputs
      const output = this.outputRing[idx]
      if (output != null) outputs.push(output)
    }
    return outputs
  }

  private resetOutputs(outputs: RuntimeOutput[]) {
    this.outputRing.splice(0, this.outputRing.length, ...outputs)
    this.outputRing.length = this.maxOutputs
    this.outputRing.fill(null, outputs.length)
    this.outputHead = 0
    this.outputCount = outputs.length
  }

  setMaxOutputs(limit: number) {
    if (!Number.isFinite(limit)) return
    const nextLimit = Math.min(Math.max(1, Math.floor(limit)), Runtime.maxMaxOutputs)
    if (this.maxOutputs === nextLimit) return
    const preservedOutputs = this.getRecentOutputs(nextLimit)
    this.maxOutputsRef.value = nextLimit
    this.resetOutputs(preservedOutputs)
    this.emitDidChangeOutput({ immediate: true })
  }

  addOutput(output: RuntimeOutputInput) {
    const nextOutput: RuntimeOutput = { ...output, id: this.nextOutputId++ }
    if (this.outputCount < this.maxOutputs) {
      const tailIdx = (this.outputHead + this.outputCount) % this.maxOutputs
      this.outputRing[tailIdx] = nextOutput
      this.outputCount += 1
    } else {
      this.outputRing[this.outputHead] = nextOutput
      this.outputHead = (this.outputHead + 1) % this.maxOutputs
    }
    this.emitDidChangeOutput()
  }

  clearOutputs() {
    this.outputRing.length = 0
    this.outputHead = 0
    this.outputCount = 0
    this.emitDidChangeOutput({ immediate: true })
  }

  constructor(private project: SpxProject) {
    super()

    // Use detached scope to prevent vue component setup from capturing watch-effects below, which are expected to be handled by `Runtime` itself.
    // If not, error `TypeError: Cannot read properties of undefined (reading 'stop')` will be thrown when component unmounted.
    // TODO: we may extract this pattern as a method of class `Disposable`, e.g. `runWithDetachedEffectScope`, to simplify the usage.
    const scope = effectScope(true)
    scope.run(() => {
      watch(
        () => this.project.exportFiles(),
        async () => {
          await until(() => this.running.mode !== 'debug')
          this.clearOutputs()
        }
      )
    })
    this.addDisposer(() => {
      if (this.outputChangeEventTimer != null) {
        clearTimeout(this.outputChangeEventTimer)
        this.outputChangeEventTimer = null
      }
    })
    this.addDisposer(() => scope.stop())
  }
}
