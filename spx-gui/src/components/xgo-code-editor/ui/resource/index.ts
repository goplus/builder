import { watch } from 'vue'
import { debounce } from 'lodash'
import { TaskManager } from '@/utils/task'
import Emitter from '@/utils/emitter'
import { type ResourceReference } from '../../common'
import type { CodeEditorUIController } from '../code-editor-ui'

export type { IResourceAdapter } from '../../resource'

export type InternalResourceReference = ResourceReference & {
  id: string
}

export class ResourceReferenceController extends Emitter<{
  didStartModifying: void
}> {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private itemsMgr = new TaskManager(async (signal) => {
    const adapter = this.ui.codeEditor.resourceAdapter
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) return []
    const items = await adapter.provideResourceReferences({ textDocument, signal })
    return items.map<InternalResourceReference>((item, i) => ({ ...item, id: i + '' }))
  }, true)

  get items() {
    return this.itemsMgr.result.data
  }

  init() {
    const refreshItems = debounce(() => this.itemsMgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.ui.codeEditor.resourceAdapter, this.ui.project.exportFiles(), this.ui.activeTextDocument] as const,
        () => {
          refreshItems()
        },
        { immediate: true }
      )
    )
  }
}
