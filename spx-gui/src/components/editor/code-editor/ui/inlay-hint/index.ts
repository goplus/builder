import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type { BaseContext, Position } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'

export enum InlayHintKind {
  Parameter = 2
}

export type InlayHintItem = {
  label: string
  kind: InlayHintKind
  position: Position
}

export type InlayHintContext = BaseContext

export interface IInlayHintProvider {
  provideInlayHints(ctx: InlayHintContext): Promise<InlayHintItem[]>
}

export class InlayHintController extends Disposable {
  private providerRef = shallowRef<IInlayHintProvider | null>(null)
  registerProvider(provider: IInlayHintProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private mgr = new TaskManager(async (signal) => {
    const provider = this.providerRef.value
    if (provider == null) return []
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) return []
    return await provider.provideInlayHints({ textDocument, signal })
  }, true)

  get items() {
    return this.mgr.result.data
  }

  init() {
    const refresh = debounce(() => this.mgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.ui.project.exportGameFiles(), this.ui.activeTextDocument],
        () => refresh(),
        { immediate: true }
      )
    )
  }
}
