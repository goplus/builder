import { shallowRef, watch } from 'vue'
import { debounce } from 'lodash'
import { TaskManager } from '@/utils/task'
import Emitter from '@/utils/emitter'
import { type ResourceReference } from '../../common'
import type { IResourceProvider } from '../../resource'
import type { CodeEditorUIController } from '../code-editor-ui'

export type { IResourceProvider } from '../../resource'

export type InternalResourceReference = ResourceReference & {
  id: string
}

export class ResourceReferenceController extends Emitter<{
  didStartModifying: void
}> {
  private providerRef = shallowRef<IResourceProvider | null>(null)
  registerProvider(provider: IResourceProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private itemsMgr = new TaskManager(async (signal) => {
    const provider = this.providerRef.value
    if (provider == null) return []
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) return []
    const items = await provider.provideResourceReferences({ textDocument, signal })
    return items.map<InternalResourceReference>((item, i) => ({ ...item, id: i + '' }))
  }, true)

  get items() {
    return this.itemsMgr.result.data
  }

  init() {
    const refreshItems = debounce(() => this.itemsMgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.providerRef.value, this.ui.project.exportFiles(), this.ui.activeTextDocument] as const,
        ([provider]) => {
          if (provider == null) return
          refreshItems()
        },
        { immediate: true }
      )
    )
  }
}
