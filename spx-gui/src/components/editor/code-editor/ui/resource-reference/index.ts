import { computed, shallowRef, watch } from 'vue'
import { debounce } from 'lodash'
import { TaskManager } from '@/utils/task'
import Emitter from '@/utils/emitter'
import { ResourceReferenceKind, type BaseContext, type ResourceReference } from '../../common'
import { toMonacoRange } from '../common'
import type { CodeEditorUI } from '../code-editor-ui'
import { checkModifiable } from './ResourceReferenceUI.vue'
import { createResourceSelector } from './selector'

export type ResourceReferencesContext = BaseContext

export type InternalResourceReference = ResourceReference & {
  id: string
}

export interface IResourceReferencesProvider
  extends Emitter<{
    didChangeResourceReferences: []
  }> {
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
    if (provider == null) throw new Error('No provider registered')
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) throw new Error('No active text document')
    const items = await provider.provideResourceReferences({ textDocument, signal })
    return items.map<InternalResourceReference>((item, i) => ({ ...item, id: i + '' }))
  })

  get items() {
    return this.itemsMgr.result.data
  }

  private modifyingRef = shallowRef<InternalResourceReference | null>(null)
  get modifying() {
    return this.modifyingRef.value
  }
  private selectorComputed = computed(() => {
    if (this.modifying == null) return null
    return createResourceSelector(this.ui.project, this.modifying)
  })
  get selector() {
    return this.selectorComputed.value
  }
  startModifying(rrId: string) {
    this.modifyingRef.value = this.items?.find((item) => item.id === rrId) ?? null
    this.emit('didStartModifying')
  }
  stopModifying() {
    this.modifyingRef.value = null
    this.ui.editor.focus()
  }
  applySelected(newResourceName: string) {
    const selecting = this.modifying
    if (selecting == null) return
    this.stopModifying()
    const insertText = `"${newResourceName}"`
    this.ui.editor.executeEdits(
      'modify-resource-reference',
      [
        {
          range: toMonacoRange(selecting.range),
          text: insertText
        }
      ],
      [
        new this.ui.monaco.Selection(
          selecting.range.start.line,
          selecting.range.start.column,
          selecting.range.start.line,
          selecting.range.start.column + insertText.length
        )
      ]
    )
    this.ui.editor.focus()
  }

  init() {
    const { editor } = this.ui

    const refreshItems = debounce(() => this.itemsMgr.start(), 100)

    this.addDisposer(
      watch(
        this.providerRef,
        (provider, _, onCleanup) => {
          if (provider == null) return
          refreshItems()
          onCleanup(provider.on('didChangeResourceReferences', refreshItems))
        },
        { immediate: true }
      )
    )

    this.addDisposer(watch(
      () => this.ui.project.filesHash,
      () => refreshItems(),
      { immediate: true }
    ))

    const editorEl = editor.getDomNode()
    if (editorEl == null) throw new Error('No editor dom node')

    let clickingId: string | null = null

    // Attach event to the dom element with `capture` instead of listening to monaco-editor,
    // to avoid cursor-change when user clicking on interactive resource reference icon
    editorEl.addEventListener(
      'mousedown',
      (e) => {
        if (!(e.target instanceof HTMLElement)) return
        const rrId = checkModifiable(e.target)
        if (rrId == null) return
        e.preventDefault()
        e.stopPropagation()
        clickingId = rrId
      },
      { capture: true, signal: this.getSignal() }
    )

    editorEl.addEventListener(
      'mouseup',
      (e) => {
        if (clickingId == null) return
        if (!(e.target instanceof HTMLElement)) return
        const rrId = checkModifiable(e.target)
        if (rrId != null && rrId === clickingId) {
          e.preventDefault()
          e.stopPropagation()
          this.startModifying(rrId)
        }
        clickingId = null
      },
      { capture: true, signal: this.getSignal() }
    )

    this.addDisposable(editor.onMouseDown(() => this.stopModifying()))
  }
}

export function isModifiableKind(kind: ResourceReferenceKind) {
  return [
    // ResourceReferenceKind.AutoBindingReference, // consider cases like `Foo.say "xxx"`, modifying `Foo` is complicated
    ResourceReferenceKind.ConstantReference,
    ResourceReferenceKind.StringLiteral
  ].includes(kind)
}
