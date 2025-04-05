import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import { type BaseContext, type Range } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'
import type Emitter from '@/utils/emitter'
// 定义完形填空区域的类型
export enum ClozeAreaType {
  // 可编辑区域，多行（代码块）
  Editable = 'editable',
  // 可编辑区域，单行挖空
  EditableSingleLine = 'editableSingleLine'
}

// 定义完形填空区域
export type ClozeArea = {
  // 区域范围
  range: Range
  // 区域类型
  type: ClozeAreaType
}

export type ClozeTestContext = BaseContext

export interface IClozeTestProvider
  extends Emitter<{
    didChangeClozeAreas: []
  }> {
  provideClozeAreas(ctx: ClozeTestContext): ClozeArea[]
  setClozeAreas(areas: ClozeArea[]): void
}

export class ClozeTestController extends Disposable {
  private providerRef = shallowRef<IClozeTestProvider | null>(null)

  registerProvider(provider: IClozeTestProvider | null) { 
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private clozeAreasMgr = new TaskManager(async (signal) => {
    const provider = this.providerRef.value
    if (provider == null) throw new Error('No cloze test provider registered')
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) throw new Error('No active text document')
    return provider.provideClozeAreas({ textDocument, signal })
  })

  get clozeAreas() {
    return this.clozeAreasMgr.result.data
  }

  init() {
    const refreshClozeAreas = debounce(() => this.clozeAreasMgr.start(), 100)
    this.addDisposer(
      watch(
        this.providerRef,
        (provider, _, onCleanup) => {
          if (provider == null) return
          refreshClozeAreas()
          onCleanup(provider.on('didChangeClozeAreas', refreshClozeAreas))
        },
        { immediate: true }
      )
    )
  }
}
