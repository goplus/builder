import { computed, shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import type Emitter from '@/utils/emitter'
import { ResourceReferenceKind, type BaseContext, type Range, type ResourceIdentifier } from '../../common'
import type { CodeEditorUI } from '..'
import type { TextDocument } from '../text-document'
import { toMonacoPosition, type monaco, toMonacoRange } from '../common'
import { makeContentWidgetEl } from '../CodeEditorUI.vue'
import { checkSelectTrigger } from './ResourceReferenceUI.vue'
import { createResourceSelector } from './selector'

export type ResourceReferencesContext = BaseContext

export type ResourceReference = {
  kind: ResourceReferenceKind
  range: Range
  resource: ResourceIdentifier
}

export type InternalResourceReference = ResourceReference & {
  id: string
}

export interface IResourceReferencesProvider
  extends Emitter<{
    didChangeResourceReferences: []
  }> {
  provideResourceReferences(ctx: ResourceReferencesContext): Promise<ResourceReference[]>
}

export class ResourceReferenceController extends Disposable {
  private providerRef = shallowRef<IResourceReferencesProvider | null>(null)
  registerProvider(provider: IResourceReferencesProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private itemsRef = shallowRef<InternalResourceReference[] | null>(null)
  get items() {
    return this.itemsRef.value
  }

  private async refreshItems(provider: IResourceReferencesProvider, textDocument: TextDocument, signal: AbortSignal) {
    const items = await provider.provideResourceReferences({ textDocument, signal })
    this.itemsRef.value = items.map((item, i) => ({ ...item, id: i + '' }))
  }

  private lastTryCtrl: AbortController | null = null
  private tryRefreshItems() {
    const textDocument = this.ui.activeTextDocument
    const provider = this.providerRef.value
    if (textDocument == null || provider == null) return
    if (this.lastTryCtrl != null) this.lastTryCtrl.abort()
    this.lastTryCtrl = new AbortController()
    this.refreshItems(provider, textDocument, this.lastTryCtrl.signal)
  }

  private selectingRef = shallowRef<InternalResourceReference | null>(null)
  get selecting() {
    return this.selectingRef.value
  }
  private selectorComputed = computed(() => {
    if (this.selecting == null) return null
    return createResourceSelector(this.ui.project, this.selecting)
  })
  get selector() {
    return this.selectorComputed.value
  }
  stopSelecting() {
    this.selectingRef.value = null
    this.ui.editor.focus()
  }
  applySelected(newResourceName: string) {
    const selecting = this.selecting
    if (selecting == null) return
    console.warn('TODO: confirm selecting', newResourceName)
    this.stopSelecting()
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
    // this.ui.editor.se
    this.ui.editor.focus()
  }

  selectorWidgetEl = makeContentWidgetEl()
  private selectorWidget: monaco.editor.IContentWidget = {
    getId: () => `resource-reference-selector-for-${this.ui.id}`,
    getDomNode: () => this.selectorWidgetEl,
    getPosition: () => {
      const monaco = this.ui.monaco
      const selecting = this.selectingRef.value
      return {
        position: selecting == null ? null : toMonacoPosition(selecting.range.start),
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE
        ]
      }
    }
  }

  init() {
    const { editor, editorEl } = this.ui

    this.addDisposer(
      watch(
        () => this.ui.activeTextDocument,
        (textDocument, __, onCleanup) => {
          if (textDocument == null) return
          this.tryRefreshItems()
          onCleanup(textDocument.on('didChangeContent', () => this.tryRefreshItems()))
        },
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        this.providerRef,
        (provider, __, onCleanup) => {
          if (provider == null) return
          this.tryRefreshItems()
          onCleanup(provider.on('didChangeResourceReferences', () => this.tryRefreshItems()))
        },
        { immediate: true }
      )
    )

    this.addDisposer(
      watch(this.selectingRef, (selecting, _, onCleanup) => {
        if (selecting == null) return
        editor.addContentWidget(this.selectorWidget)
        onCleanup(() => editor.removeContentWidget(this.selectorWidget))
      })
    )

    let clickingId: string | null = null

    // Attach event to the dom element with `capture` instead of listening to monaco-editor,
    // to avoid cursor-change when user clicking on interactive resource reference icon
    editorEl.addEventListener(
      'mousedown',
      (e) => {
        if (!(e.target instanceof HTMLElement)) return
        const rrId = checkSelectTrigger(e.target)
        if (rrId == null) return
        e.preventDefault()
        e.stopPropagation()
        clickingId = rrId
      },
      { capture: true }
    )

    editorEl.addEventListener(
      'mouseup',
      (e) => {
        if (clickingId == null) return
        if (!(e.target instanceof HTMLElement)) return
        const rrId = checkSelectTrigger(e.target)
        if (rrId === clickingId) {
          e.preventDefault()
          e.stopPropagation()
          this.selectingRef.value = this.items?.find((item) => item.id === rrId) ?? null
        }
        clickingId = null
      },
      { capture: true }
    )
  }
}

export function isSelectabe(item: InternalResourceReference) {
  return [
    ResourceReferenceKind.AutoBindingReference,
    ResourceReferenceKind.ConstantReference,
    ResourceReferenceKind.StringLiteral
  ].includes(item.kind)
}
