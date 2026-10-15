import { effectScope, ref, shallowRef, watch } from 'vue'
import Emitter from '@/utils/emitter'
import { until } from '@/utils/utils'
import type { SpxProject } from '@/models/spx/project'
import type { TextDocumentIdentifier, TextDocumentRange } from '@/components/xgo-code-editor'

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

export type RuntimeOutputDraft = Omit<RuntimeOutput, 'id'>

export interface RuntimeLocation {
  textDocument: TextDocumentIdentifier
  /** Line number, starting from 1. */
  line: number
}

export class Runtime extends Emitter<{
  /** Every appended entry, emitted synchronously before any UI snapshot flush. */
  didAppendOutput: RuntimeOutput
  /** The bounded UI snapshot changed, batched per frame except when cleared. */
  didChangeOutputSnapshot: void
  /** Emitted once after a run or rerun succeeds. */
  didStart: void
  didChangeLocations: void
  didExit: number
}> {
  static readonly defaultMaxOutputs = 500

  private runningRef = shallowRef<RunningState>({ mode: 'none' })
  private filesHashRef = ref<string | null>(null)
  private outputSnapshotRef = shallowRef<RuntimeOutput[]>([])
  private locationsRef = shallowRef<readonly RuntimeLocation[]>([])

  get running() {
    return this.runningRef.value
  }

  get filesHash() {
    return this.filesHashRef.value
  }

  get maxOutputs() {
    return Runtime.defaultMaxOutputs
  }

  /** Public output snapshot, updated together with `didChangeOutputSnapshot` for batched UI consumption. */
  get outputSnapshot(): readonly RuntimeOutput[] {
    return this.outputSnapshotRef.value
  }

  get locations(): readonly RuntimeLocation[] {
    return this.locationsRef.value
  }

  setLocations(locations: readonly RuntimeLocation[]) {
    if (this.running.mode !== 'debug' && locations.length > 0) return
    this.locationsRef.value = locations
    this.emit('didChangeLocations')
  }

  setRunning(running: RunningState, filesHash?: string) {
    if (running.mode === 'none') this.setLocations([])
    else if (running.initializing) this.setLocations([])
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
  private scheduledOutputFlush: number | null = null

  private syncOutputSnapshot() {
    const outputs: RuntimeOutput[] = []
    for (let i = 0; i < this.outputCount; i++) {
      const idx = (this.outputHead + i) % this.maxOutputs
      const output = this.outputRing[idx]
      if (output != null) outputs.push(output)
    }
    this.outputSnapshotRef.value = outputs
  }

  private flushDidChangeOutputSnapshot() {
    this.scheduledOutputFlush = null
    this.syncOutputSnapshot()
    this.emit('didChangeOutputSnapshot')
  }

  private scheduleDidChangeOutputSnapshot() {
    this.scheduledOutputFlush = requestAnimationFrame(() => this.flushDidChangeOutputSnapshot())
  }

  private cancelScheduledDidChangeOutputSnapshot() {
    if (this.scheduledOutputFlush == null) return
    cancelAnimationFrame(this.scheduledOutputFlush)
    this.scheduledOutputFlush = null
  }

  private emitDidChangeOutputSnapshot({ immediate = false }: { immediate?: boolean } = {}) {
    if (immediate) {
      this.cancelScheduledDidChangeOutputSnapshot()
      this.flushDidChangeOutputSnapshot()
      return
    }
    if (this.scheduledOutputFlush != null) return
    this.scheduleDidChangeOutputSnapshot()
  }

  addOutput(output: RuntimeOutputDraft) {
    const nextOutput: RuntimeOutput = { ...output, id: this.nextOutputId++ }
    if (this.outputCount < this.maxOutputs) {
      const tailIdx = (this.outputHead + this.outputCount) % this.maxOutputs
      this.outputRing[tailIdx] = nextOutput
      this.outputCount += 1
    } else {
      this.outputRing[this.outputHead] = nextOutput
      this.outputHead = (this.outputHead + 1) % this.maxOutputs
    }
    this.emit('didAppendOutput', nextOutput)
    this.emitDidChangeOutputSnapshot()
  }

  clearOutputs() {
    this.outputRing.length = 0
    this.outputHead = 0
    this.outputCount = 0
    this.emitDidChangeOutputSnapshot({ immediate: true })
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
    this.addDisposer(() => this.cancelScheduledDidChangeOutputSnapshot())
    this.addDisposer(() => scope.stop())
  }
}
