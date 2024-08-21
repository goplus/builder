import {
  editor as IEditor,
  Position,
  type IRange,
  type languages,
  type IDisposable
} from 'monaco-editor'
import { Disposable } from '@/utils/disposable'
import {
  type CompletionMenu,
  Icon2CompletionItemKind
} from '@/components/editor/code-editor/ui/features/completion-menu/completion-menu'
import loader from '@monaco-editor/loader'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { injectMonacoHighlightTheme } from '@/components/editor/code-editor/ui/common/languages'
import type { Project } from '@/models/project'
import type { I18n } from '@/utils/i18n'
import type { FormatResponse } from '@/apis/util'
import formatWasm from '@/assets/format.wasm?url'
import { getAllTools } from '@/components/editor/code-editor/tools'

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

declare global {
  /** Notice: this is available only after `initFormatWasm()` */
  function formatSPX(input: string): FormatResponse
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function initFormatWasm() {
  const go = new Go()
  const result = await WebAssembly.instantiateStreaming(fetch(formatWasm), go.importObject)
  go.run(result.instance)
}

export class EditorUI extends Disposable {
  i18n: I18n
  getProject: () => Project
  completionMenu: CompletionMenu | null = null
  editorUIRequestCallback: EditorUIRequestCallback
  monaco: typeof import('monaco-editor') | null = null
  monacoProviderDisposes: Record<string, IDisposable | null> = {
    completionProvider: null,
    hoverProvider: null
  }

  constructor(i18n: I18n, getProject: () => Project) {
    super()

    this.i18n = i18n

    this.getProject = getProject
    this.editorUIRequestCallback = {
      completion: []
    }

    this.addDisposer(() => {
      for (const callbackKey in this.editorUIRequestCallback) {
        this.editorUIRequestCallback[callbackKey as keyof EditorUIRequestCallback].length = 0
      }
    })
  }

  public async getMonaco() {
    if (this.monaco) return this.monaco
    const monaco_ = await loader.init()
    if (this.monaco) return this.monaco
    await this.initMonaco(monaco_, this.getProject)
    this.monaco = monaco_
    return this.monaco
  }

  async initMonaco(monaco: typeof import('monaco-editor'), getProject: () => Project) {
    self.MonacoEnvironment = {
      getWorker() {
        return new EditorWorker()
      }
    }

    const LANGUAGE_NAME = 'spx'
    monaco.languages.register({
      id: LANGUAGE_NAME
    })

    // keep this for auto match brackets when typing
    monaco.languages.setLanguageConfiguration(LANGUAGE_NAME, {
      // tokenize all words as identifiers
      wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
        ['"', '"'],
        ["'", "'"]
      ]
    })

    this.monacoProviderDisposes.completionProvider =
      monaco.languages.registerCompletionItemProvider(LANGUAGE_NAME, {
        provideCompletionItems: (model, position, _, cancelToken) => {
          // get current position id to determine if need to request completion provider resolve
          const word = model.getWordUntilPosition(position)
          const project = getProject()
          const fileHash = project.currentFilesHash || ''
          const completionItemCacheID = {
            id: fileHash,
            lineNumber: position.lineNumber,
            column: word.startColumn
          }

          // is CompletionItemCacheID changed, inner cache will clean `cached data`
          // in a word, if CompletionItemCacheID changed will call `requestCompletionProviderResolve`
          const isNeedRequestCompletionProviderResolve =
            !this.completionMenu?.completionItemCache.isCacheAvailable(completionItemCacheID)

          if (isNeedRequestCompletionProviderResolve) {
            const abortController = new AbortController()
            cancelToken.onCancellationRequested(() => abortController.abort())
            this.requestCompletionProviderResolve(
              model,
              {
                position,
                unitWord: word.word,
                signal: abortController.signal
              },
              (items: CompletionItem[]) => {
                this.completionMenu?.completionItemCache.add(completionItemCacheID, items)
                // if you need user immediately show updated completion items, we need close it and reopen it.
                this.completionMenu?.editor.trigger('editor', 'hideSuggestWidget', {})
                this.completionMenu?.editor.trigger('keyboard', 'editor.action.triggerSuggest', {})
              }
            )
            return { suggestions: [] }
          } else {
            const suggestions =
              this.completionMenu?.completionItemCache.getAll(completionItemCacheID).map(
                (item): languages.CompletionItem => ({
                  label: item.label,
                  kind: Icon2CompletionItemKind(item.icon),
                  insertText: item.insertText,
                  range: {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                  }
                })
              ) || []
            return { suggestions }
          }
        }
      })

    // temp region start ##
    // the following code will be replaced after `document.ts` is ready
    const i18n = this.i18n

    this.monacoProviderDisposes.hoverProvider = monaco.languages.registerHoverProvider(
      LANGUAGE_NAME,
      {
        provideHover(model, position) {
          const word = model.getWordAtPosition(position)
          if (word == null) return
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          }
          const tools = getAllTools(getProject())
          const tool = tools.find((s) => s.keyword === word.word)
          if (tool == null) return
          let text = i18n.t(tool.desc) + i18n.t({ en: ', e.g.', zh: '，示例：' })
          if (tool.usage != null) {
            text += ` 
\`\`\`gop
${tool.usage.sample}
\`\`\``
          } else {
            text = [
              text,
              ...tool.usages!.map((usage) => {
                const colon = i18n.t({ en: ': ', zh: '：' })
                const desc = i18n.t(usage.desc)
                return `* ${desc}${colon}
\`\`\`gop
${usage.sample}
\`\`\``
              })
            ].join('\n')
          }
          return {
            range,
            contents: [{ value: text }]
          }
        }
      }
    )
    // temp region end ##

    await injectMonacoHighlightTheme(monaco)
  }

  /**
   * providers need to be disposed before the editor is destroyed.
   * otherwise, it will cause duplicate completion items when HMR is triggered in development mode.
   */
  public disposeMonacoProviders() {
    if (this.monacoProviderDisposes.completionProvider) {
      this.monacoProviderDisposes.completionProvider.dispose()
      this.monacoProviderDisposes.completionProvider = null
    }
    if (this.monacoProviderDisposes.hoverProvider) {
      this.monacoProviderDisposes.hoverProvider.dispose()
      this.monacoProviderDisposes.hoverProvider = null
    }
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
