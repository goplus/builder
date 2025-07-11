import { effectScope, reactive, watch } from 'vue'
import Emitter from '@/utils/emitter'
import { until } from '@/utils/utils'
import type { Project } from '@/models/project'

// TODO: move TextDocumentRange to some proper place
import type { TextDocumentRange } from './code-editor/common'

export type RunningState =
  | {
      /** Not running */
      mode: 'none'
    }
  | {
      /** Debugging, run in place */
      mode: 'debug'
      /** Initializing for debug */
      initializing: boolean
    }
  | {
      /** Running full screen */
      mode: 'run'
    }

export enum RuntimeOutputKind {
  Error = 'error',
  Log = 'log'
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
  running: RunningState = { mode: 'none' }

  setRunning(running: RunningState, filesHash?: string) {
    this.running = running
    if (running.mode === 'debug' && running.initializing === false) {
      if (filesHash == null) throw new Error('filesHash is required when running in debug mode')
      this.filesHash = filesHash
    }
  }

  /** Outputs of last debugging */
  outputs: RuntimeOutput[] = []
  /** Project files' hash of last debugging */
  filesHash: string | null = null

  addOutput(output: RuntimeOutput) {
    this.outputs.push(output)
  }

  clearOutputs() {
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
        () => reactiveThis.project.exportGameFiles(),
        async () => {
          await until(() => reactiveThis.running.mode !== 'debug')
          reactiveThis.clearOutputs()
        }
      )
    })
    reactiveThis.addDisposer(() => scope.stop())

    return reactiveThis
  }
}
