import { shallowRef, watch } from 'vue'
import { debounce } from 'lodash'
import { TaskManager } from '@/utils/task'
import Emitter from '@/utils/emitter'
import { type BaseContext, type ResourceReference } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'

export type ResourceReferencesContext = BaseContext

export type InternalResourceReference = ResourceReference & {
  id: string
}

export interface IResourceReferencesProvider {
  provideResourceReferences(ctx: ResourceReferencesContext): Promise<ResourceReference[]>
}

export class ResourceReferenceController extends Emitter<{
  didStartModifying: void
}> {
  private providerRef = shallowRef<IResourceReferencesProvider | null>(null)
  registerProvider(provider: IResourceReferencesProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
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
        () => [this.providerRef.value, this.ui.project.exportGameFiles(), this.ui.activeTextDocument] as const,
        ([provider]) => {
          if (provider == null) return
          refreshItems()
        },
        { immediate: true }
      )
    )
  }
}
