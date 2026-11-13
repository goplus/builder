import { shallowRef, watch } from 'vue'
import { debounce } from 'lodash'
import { TaskManager } from '@/utils/task'
import Emitter from '@/utils/emitter'
import {
  containsPosition,
  InputKind,
  isResourceUri,
  type Position,
  type ResourceIdentifier,
  type ResourceReference
} from '../../common'
import { fromMonacoPosition } from '../common'
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

  private hoveredPosition = shallowRef<Position | null>(null)
  private previewResourceRef = shallowRef<ResourceIdentifier | null>(null)
  private previewEnabled = shallowRef(false)

  get hoveredResource(): ResourceIdentifier | null {
    if (!this.previewEnabled.value) return null
    if (this.previewResourceRef.value != null) return this.previewResourceRef.value
    const position = this.hoveredPosition.value
    if (position == null) return null
    const reference = this.items?.find((item) => containsPosition(item.range, position))
    if (reference != null) return reference.resource
    const slot = this.ui.inputHelperController.slots?.find((item) => containsPosition(item.range, position))
    const input = slot?.input
    if (input?.kind !== InputKind.InPlace || typeof input.value !== 'string' || !isResourceUri(input.value)) return null
    return { uri: input.value }
  }

  previewResource(resource: ResourceIdentifier | null) {
    this.previewResourceRef.value = resource
  }

  init(previewEnabled = false) {
    this.previewEnabled.value = previewEnabled
    const refreshItems = debounce(() => this.itemsMgr.start(), 100)
    this.addDisposer(() => refreshItems.cancel())

    this.addDisposer(
      watch(
        () => [this.ui.codeEditor.resourceAdapter, this.ui.project.exportFiles(), this.ui.activeTextDocument] as const,
        () => {
          refreshItems()
        },
        { immediate: true }
      )
    )

    if (!previewEnabled) return
    const { editor, monaco } = this.ui
    const clear = () => {
      this.hoveredPosition.value = null
    }
    const clearLater = debounce(clear, 120)
    this.addDisposer(() => clearLater.cancel())
    this.addDisposable(
      editor.onMouseMove(({ target }) => {
        clearLater.cancel()
        if (
          target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT ||
          target.detail.mightBeForeignElement ||
          this.ui.inputHelperController.inputingSlot != null
        ) {
          clear()
          return
        }
        const position = fromMonacoPosition({
          lineNumber: target.range.startLineNumber,
          column: target.range.startColumn
        })
        const previous = this.hoveredPosition.value
        if (previous?.line === position.line && previous.column === position.column) return
        this.hoveredPosition.value = position
      })
    )
    editor.getDomNode()?.addEventListener('mouseleave', () => clearLater(), { signal: this.getSignal() })
    this.addDisposer(this.ui.hoverController.on('cardMouseEnter', () => clearLater.cancel()))
    this.addDisposer(this.ui.hoverController.on('cardMouseLeave', () => clearLater()))
    this.addDisposable(editor.onKeyDown(clear))
    this.addDisposable(editor.onMouseDown(clear))
    this.addDisposable(editor.onDidChangeModelContent(clear))
    const clearPreview = () => {
      clear()
      this.previewResourceRef.value = null
    }
    this.addDisposer(watch(() => this.ui.activeTextDocument, clearPreview))
    window.addEventListener('blur', clearPreview, { signal: this.getSignal() })
    this.addDisposer(clearPreview)
  }
}
