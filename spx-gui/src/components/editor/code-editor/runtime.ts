import { watch } from 'vue'
import type { RuntimeError } from '@/models/runtime'
import { Disposable, type Disposer } from '@/utils/disposable'
import type { EditorCtx } from '../EditorContextProvider.vue'

export class Runtime extends Disposable {
  private errorCallbacks: ((errors: RuntimeError[]) => void)[] = []
  private editorCtx: EditorCtx

  constructor(editorCtx: EditorCtx) {
    super()
    this.editorCtx = editorCtx
    watch(
      () => editorCtx.debugErrorList,
      () => {
        this.notifyErrors()
      },
    )
  }

  private notifyErrors() {
    this.errorCallbacks.forEach((cb) => cb(this.editorCtx.debugErrorList))
  }

  onRuntimeErrors(cb: (errors: RuntimeError[]) => void): Disposer {
    this.errorCallbacks.push(cb)
    const disposer: Disposer = () => {
      this.errorCallbacks = this.errorCallbacks.filter((callback) => callback !== cb)
    }
    this.addDisposer(disposer)
    return disposer
  }
}
