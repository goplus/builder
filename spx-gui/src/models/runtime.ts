import { effectScope, reactive, watch } from 'vue'
import Emitter from '@/utils/emitter'
import { until } from '@/utils/utils'
import type { Project } from '@/models/project'

// TODO: move TextDocumentRange to some proper place
import type { TextDocumentRange } from '../components/editor/code-editor/common'

export type RunningMode =
  /** Not running */
  | 'none'
  /** Debugging, run in place */
  | 'debug'
  /** Running full screen */
  | 'run'

export enum RuntimeOutputKind {
  Error,
  Log
}

export interface RuntimeOutput {
  kind: RuntimeOutputKind
  time: number
  message: string
  source?: TextDocumentRange
}

export class Runtime extends Emitter<{
  didChangeOutput: void
}> {
  running: RunningMode = 'none'

  setRunning(running: RunningMode) {
    this.running = running
    if (running === 'debug') {
      this.clearOutputs()
    }
  }

  outputs: RuntimeOutput[] = []

  getOutputs(): RuntimeOutput[] {
    return this.outputs
  }

  addOutput(output: RuntimeOutput) {
    this.outputs.push(output)
  }

  private clearOutputs() {
    this.outputs.splice(0, this.outputs.length)
  }

  constructor(private project: Project) {
    super()

    const reactiveThis = reactive(this) as this

    // Use detached scope to prevent vue component setup from capturing watch-effects below, which are expected to be handled by `Runtime` itself.
    // If not, error `TypeError: Cannot read properties of undefined (reading 'stop')` will be thrown when component unmounted.
    // TODO: we may extract this pattern as a method of class `Disposable`, e.g. `runWithDetachedEffectScope`, to simplify the usage.
    const scope = effectScope(true)
    scope.run(() => {
      watch(
        () => reactiveThis.outputs.slice(),
        () => reactiveThis.emit('didChangeOutput')
      )
      watch(
        () => reactiveThis.project.filesHash,
        async (_, oldHash) => {
          if (oldHash == null) return
          await until(() => reactiveThis.running === 'none')
          reactiveThis.clearOutputs()
        }
      )
    })
    reactiveThis.addDisposer(() => scope.stop())

    return reactiveThis
  }
}
