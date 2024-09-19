import { watch } from 'vue'
import type { RuntimeError } from '@/models/runtime'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { Disposable, type Disposer } from '@/utils/disposable'

const editorCtx = useEditorCtx()

export class Runtime extends Disposable {
  private errorCallbacks: ((errors: RuntimeError[]) => void)[] = []

  constructor() {
    super()
    watch(
      () => editorCtx.debugErrorList,
      () => {
        this.notifyErrors()
      },
    )
  }

  private notifyErrors() {
    this.errorCallbacks.forEach((cb) => cb(editorCtx.debugErrorList))
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
