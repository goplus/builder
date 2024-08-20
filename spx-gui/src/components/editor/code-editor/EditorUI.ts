import { editor as IEditor, Position, type IRange } from 'monaco-editor'
import { Disposable } from '@/utils/disposable'
import type { CompletionMenu } from '@/components/editor/code-editor/ui/features/completion-menu/completion-menu'

export interface TextModel extends IEditor.ITextModel {}

export enum Icon {
  Function,
  Event,
  Prototype,
  Keywords,
  AIAbility,
  Document,
  Rename,
  Playlist
}

export type Markdown = string

export type DocPreview = {
  content: Markdown
  recommendAction?: RecommendAction | undefined
  moreActions?: Action[] | undefined
}

export type AudioPlayer = {
  src: string
  duration: number
}

export interface RenamePreview {
  placeholder: string
  onSubmit(
    newName: string,
    ctx: {
      signal: AbortSignal
    },
    setError: (message: string) => void
  ): Promise<void>
}

export type LayerContent = DocPreview | AudioPlayer | RenamePreview

export interface CompletionItem {
  icon: Icon
  label: string
  desc: string
  insertText: string
  preview: LayerContent
}

export type InlayHintBehavior = 'none' | 'triggerCompletion'
export type InlayHintStyle = 'tag' | 'text' | 'icon'

export type InlayHint = {
  content: string | Icon
  style: InlayHintStyle
  behavior: InlayHintBehavior
  position: Position
}

export interface InlayHintsProvider {
  provideInlayHints(
    model: TextModel,
    ctx: {
      signal: AbortSignal
    }
  ): Promise<InlayHint[]>
}

export type SelectionMenuItem = {
  icon: Icon
  label: string
  action: () => void
}

export interface SelectionMenuProvider {
  provideSelectionMenuItems(
    model: TextModel,
    ctx: {
      selection: IRange
      selectContent: string
    }
  ): Promise<SelectionMenuItem[]>
}

export interface CompletionProvider {
  provideDynamicCompletionItems(
    model: TextModel,
    ctx: {
      position: Position
      unitWord: string
      signal: AbortSignal
    },
    addItems: (items: CompletionItem[]) => void
  ): void
}

export interface HoverProvider {
  provideHover(
    model: TextModel,
    ctx: {
      position: Position
      hoverUnitWord: string
      signal: AbortSignal
    }
  ): Promise<LayerContent>
}

export type InputItemUsage = {
  desc: LayerContent
  insertText: string
}

export type InputItem = {
  icon: Icon
  label: string
  desc: string
  usages: InputItemUsage[]
}

export type InputItemGroup = {
  label: string
  inputItems: InputItem[]
}

export type InputItemCategory = {
  label: string
  icon: Icon
  color: string
  groups: InputItemGroup[]
}

interface InputAssistantProvider {
  provideInputAssistant(ctx: { signal: AbortSignal }): Promise<InputItemCategory[]>
}

export enum AttentionHintLevelEnum {
  WARNING,
  ERROR
}

export type AttentionHint = {
  level: AttentionHintLevelEnum
  range: IRange
  message: string
  hoverContent: LayerContent
}

export interface AttentionHintsProvider {
  provideAttentionHints(
    setHints: (hints: AttentionHint[]) => void,
    ctx: {
      signal: AbortSignal
    }
  ): void
}

export type RecommendAction = {
  label: string
  activeLabel: string
  onActiveLabelClick(): void | LayerContent
}

export type Action = {
  icon: Icon
  label: string
  onClick(): void | LayerContent
}

export type DocDetail = Markdown

export type ReplyAction = {
  message: string
}

export type Reply = {
  message: Markdown
  actions: ReplyAction[]
}

export type AIChatModalOptions = {
  initialMessage: string
  reply?: (userMessage: Markdown) => Promise<Reply>
}

interface EditorUIRequestCallback {
  completion: CompletionProvider[]
}

export class EditorUI extends Disposable {
  editorUIRequestCallback: EditorUIRequestCallback
  completionMenu: CompletionMenu | null = null

  constructor() {
    super()
    this.editorUIRequestCallback = {
      completion: []
    }

    this.addDisposer(() => {
      for (const callbackKey in this.editorUIRequestCallback) {
        this.editorUIRequestCallback[callbackKey as keyof EditorUIRequestCallback].length = 0
      }
    })
  }

  public requestCompletionProviderResolve(
    model: TextModel,
    ctx: {
      position: Position
      unitWord: string
      signal: AbortSignal
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    this.editorUIRequestCallback.completion.forEach((item) =>
      item.provideDynamicCompletionItems(model, ctx, addItems)
    )
  }

  public registerCompletionProvider(provider: CompletionProvider) {
    this.editorUIRequestCallback.completion.push(provider)
  }
  public registerInlayHintsProvider(provider: InlayHintsProvider) {
    // todo: to resolve fn `registerInlayHintsProvider`
  }
  public registerSelectionMenuProvider(provider: SelectionMenuProvider) {
    // todo: to resolve fn `registerSelectionMenuProvider`
  }
  public registerHoverProvider(provider: HoverProvider) {
    // todo: to resolve fn `registerHoverProvider`
  }
  public registerAttentionHintsProvider(provider: AttentionHintsProvider) {
    // todo: to resolve fn `registerAttentionHintsProvider`
  }
  public registerInputAssistantProvider(provider: InputAssistantProvider) {
    // todo: to resolve fn `registerInputAssistantProvider`
  }
  public invokeAIChatModal(options: AIChatModalOptions) {
    // todo: to resolve fn `invokeAIChatModal`
  }
  public invokeDocumentDetail(docDetail: DocDetail) {
    // todo: to resolve fn `invokeDocumentDetail`
  }
}
