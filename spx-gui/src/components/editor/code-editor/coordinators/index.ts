import {
  type AttentionHintDecoration,
  AttentionHintLevelEnum,
  type CompletionItem,
  DocPreviewLevel,
  type EditorUI,
  Icon,
  type InputItem,
  type InputItemCategory,
  type LayerContent,
  type SelectionMenuItem,
  type TextModel,
  type InlayHintDecoration
} from '@/components/editor/code-editor/EditorUI'
import { Runtime } from '../runtime'
import { Compiler } from '../compiler'
import { ChatBot } from '../chat-bot'
import { DocAbility, type Doc } from '../document'
import { Project } from '@/models/project'
import { type IRange, type Position } from 'monaco-editor'
import type { I18n } from '@/utils/i18n'
import { keywords, typeKeywords } from '@/utils/spx'
import {
  controlCategory,
  eventCategory,
  gameCategory,
  getAllTools,
  lookCategory,
  motionCategory,
  sensingCategory,
  soundCategory,
  getVariableCategory,
  TokenType,
  type TokenCategory
} from '@/components/editor/code-editor/tools'
import { debounce } from '@/utils/utils'
import type { Definition, DefinitionUsage, Diagnostic } from '../compiler'

type JumpPosition = {
  line: number
  column: number
  fileUri: string
}

const VariableDefinitionType = [
  'bool',
  'int',
  'int8',
  'int16',
  'int32',
  'int64',
  'uint',
  'uint8',
  'uint16',
  'uint32',
  'uint64',
  'uintptr',
  'float32',
  'float64',
  'complex64',
  'complex128',
  'string',
  'byte',
  'rune'
]

type CoordinatorState = {
  definitions: Definition[]
  diagnostics: Diagnostic[]
}

class HoverProvider {
  private ui: EditorUI
  private docAbility: DocAbility
  private state: CoordinatorState

  constructor(ui: EditorUI, docAbility: DocAbility, state: CoordinatorState) {
    this.ui = ui
    this.docAbility = docAbility
    this.state = state
  }

  async provideHover(
    _model: TextModel,
    ctx: {
      position: Position
      hoverUnitWord: string
      signal: AbortSignal
    }
  ): Promise<LayerContent[]> {
    const contents = this.docAbility.getNormalDoc({
      module: '',
      name: ctx.hoverUnitWord
    })

    const definition = this.findDefinition(ctx.position)
    const diagnostic = this.findDiagnostic(ctx.position.lineNumber)
    const matchedContent = this.findMatchedContent(contents, definition)
    const layerContents: LayerContent[] = []

    if (diagnostic) layerContents.push(this.createDiagnosticContent(diagnostic))

    if (contents && contents.length > 0) {
      layerContents.push(...this.createDocContents(contents))
    } else if (definition && definition.usages.length > 0) {
      // in definition, usages have only one usage
      const [usage] = definition.usages
      const content = VariableDefinitionType.includes(usage.type)
        ? this.createVariableRenameContent(usage)
        : this.createDefinitionContent(usage, matchedContent)
      layerContents.push(content)
    }

    return layerContents
  }

  private findDefinition(position: Position): Definition | undefined {
    return this.state.definitions.find((def) => {
      const tokenLen = def.end_pos - def.start_pos
      const line = def.start_position.Line
      const startColumn = def.start_position.Column
      const endColumn = startColumn + tokenLen
      return (
        position.lineNumber === line &&
        position.column >= startColumn &&
        position.column <= endColumn
      )
    })
  }

  private findDiagnostic(lineNumber: number): Diagnostic | undefined {
    return this.state.diagnostics.find((diag) => diag.line === lineNumber)
  }

  private findMatchedContent(contents: Doc[] | null, definition: Definition | undefined) {
    return contents?.find(
      (content) =>
        definition &&
        content.token.id.name === definition.pkg_name &&
        content.token.id.module === definition.pkg_path
    )
  }

  private createDiagnosticContent(diagnostic: Diagnostic): LayerContent {
    return {
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Error,
        content: diagnostic.message,
        recommendAction: {
          label: this.ui.i18n.t({
            zh: '没看明白？场外求助',
            en: 'Not clear? Ask for help'
          }),
          activeLabel: this.ui.i18n.t({ zh: '在线答疑', en: 'Online Q&A' }),
          onActiveLabelClick: () => {
            // TODO: Add some logic code
          }
        }
      }
    }
  }

  private createVariableRenameContent(usage: DefinitionUsage): LayerContent {
    return {
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Normal,
        header: {
          icon: Icon.Variable,
          declaration: usage.declaration
        },
        content: '',
        moreActions: [
          {
            icon: Icon.Rename,
            label: this.ui.i18n.t({ zh: '重命名', en: 'Rename' }),
            onClick: () => ({
              type: 'rename',
              layer: {
                placeholder: this.ui.i18n.t({
                  zh: '请输入新名称',
                  en: 'Please enter a new name'
                }),
                onSubmit: async (
                  newName: string,
                  ctx: { signal: AbortSignal },
                  setError: (message: string) => void
                ) => {
                  // TODO: Add some logic code
                }
              }
            })
          }
        ]
      }
    }
  }

  private createDefinitionContent(
    usage: DefinitionUsage,
    matchedContent: Doc | undefined
  ): LayerContent {
    const actions = matchedContent ? this.createActions(matchedContent) : {}
    return {
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Normal,
        content: matchedContent?.content,
        header: {
          icon: Icon.Function,
          declaration: usage.declaration
        },
        ...actions
      }
    }
  }

  private createActions(matchedContent: Doc) {
    return {
      recommendAction: {
        label: this.ui.i18n.t({
          zh: '还有疑惑？场外求助',
          en: 'Still in confusion? Ask for help'
        }),
        activeLabel: this.ui.i18n.t({ zh: '在线答疑', en: 'Online Q&A' }),
        onActiveLabelClick: () => {
          // TODO: Add some logic code
        }
      },
      moreActions: [
        {
          icon: Icon.Document,
          label: this.ui.i18n.t({ zh: '查看文档', en: 'Document' }),
          onClick: () => {
            const detailDoc = this.docAbility.getDetailDoc(matchedContent.token)
            if (!detailDoc) return
            this.ui.invokeDocumentDetail(detailDoc.content)
          }
        }
      ]
    }
  }

  private createDocContents(contents: any[]): LayerContent[] {
    return contents.map((doc) => ({
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Normal,
        header: {
          icon: Icon.Function,
          declaration: '' // TODO: implement document struct and set declaration
        },
        content: doc.content,
        recommendAction: {
          label: this.ui.i18n.t({
            zh: '还有疑惑？场外求助',
            en: 'Still in confusion? Ask for help'
          }),
          activeLabel: this.ui.i18n.t({ zh: '在线答疑', en: 'Online Q&A' }),
          onActiveLabelClick: () => {
            // TODO: add some logic code here
          }
        },
        moreActions: [
          {
            icon: Icon.Document,
            label: this.ui.i18n.t({ zh: '查看文档', en: 'Document' }),
            onClick: () => {
              const detailDoc = this.docAbility.getDetailDoc(doc.token)
              if (!detailDoc) return
              this.ui.invokeDocumentDetail(detailDoc.content)
            }
          }
        ]
      }
    }))
  }
}

export class Coordinator {
  project: Project
  ui: EditorUI
  chatBot: ChatBot
  docAbility: DocAbility
  compiler: Compiler
  public updateDefinition = debounce(this._updateDefinition, 300)
  private state: CoordinatorState = {
    definitions: [],
    diagnostics: []
  }
  private hoverProvider: HoverProvider

  constructor(
    ui: EditorUI,
    runtime: Runtime,
    compiler: Compiler,
    chatBot: ChatBot,
    docAbility: DocAbility,
    project: Project
  ) {
    this.project = project
    this.ui = ui
    this.docAbility = docAbility
    this.chatBot = chatBot
    this.compiler = compiler
    this.hoverProvider = new HoverProvider(ui, docAbility, this.state)

    ui.registerCompletionProvider({
      provideDynamicCompletionItems: this.implementsPreDefinedCompletionProvider.bind(this)
    })

    ui.registerHoverProvider({
      provideHover: this.hoverProvider.provideHover.bind(this.hoverProvider)
    })

    ui.registerSelectionMenuProvider({
      provideSelectionMenuItems: this.implementsSelectionMenuProvider.bind(this)
    })

    ui.registerInlayHintsProvider({
      provideInlayHints: this.implementsInlayHintsProvider.bind(this)
    })

    ui.registerInputAssistantProvider({
      provideInputAssistant: this.implementsInputAssistantProvider.bind(this)
    })

    ui.registerAttentionHintsProvider({
      provideAttentionHints: this.implementsAttentionHintProvider.bind(this)
    })
  }

  get currentFilename() {
    return (this.project.selectedSprite?.name ?? 'main') + '.spx'
  }

  implementsPreDefinedCompletionProvider(
    _model: TextModel,
    _ctx: {
      position: Position
      unitWord: string
      signal: AbortSignal
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    addItems(getCompletionItems(this.ui.i18n, this.project))
  }

  async implementsSelectionMenuProvider(
    model: TextModel,
    ctx: {
      selection: IRange
      selectContent: string
    }
  ): Promise<SelectionMenuItem[]> {
    return [
      {
        icon: Icon.AIAbility,
        label: this.ui.i18n.t({ zh: '对这段代码有疑惑', en: 'Suspect this code' }),
        action: () => {
          const chat = this.chatBot.startExplainChat(ctx.selectContent)
          this.ui.invokeAIChatModal(chat)
        }
      },
      {
        icon: Icon.AIAbility,
        label: this.ui.i18n.t({ zh: '这段代码无法正常运行', en: 'This code cannot run properly' }),
        action: () => {
          const chat = this.chatBot.startFixCodeChat(ctx.selectContent)
          this.ui.invokeAIChatModal(chat)
        }
      },
      {
        icon: Icon.AIAbility,
        label: this.ui.i18n.t({ zh: '给这段代码添加注释', en: 'Add explanation to this code' }),
        action: () => {
          const chat = this.chatBot.startCommentChat(ctx.selectContent)
          this.ui.invokeAIChatModal(chat)
        }
      }
    ]
  }
  async implementsInlayHintsProvider(
    model: TextModel,
    ctx: {
      signal: AbortSignal
    }
  ): Promise<InlayHintDecoration[]> {
    const inlayHints = await this.compiler.getInlayHints(
      this.currentFilename,
      this.getProjectAllCodes()
    )

    return inlayHints.flatMap((inlayHint): InlayHintDecoration[] => {
      // from compiler has two type of inlay hint, so here use if else to distinguish
      if (inlayHint.type === 'play') {
        return [
          {
            content: Icon.Playlist,
            style: 'icon',
            behavior: 'triggerCompletion',
            position: {
              lineNumber: inlayHint.end_position.Line,
              column: inlayHint.end_position.Column
            }
          }
        ]
      } else {
        const hints: InlayHintDecoration[] = [
          {
            content: inlayHint.name,
            style: 'text',
            behavior: 'none',
            position: {
              lineNumber: inlayHint.start_position.Line,
              column: inlayHint.start_position.Column
            }
          }
        ]
        if (inlayHint.unit) {
          hints.push({
            content: inlayHint.name,
            style: 'tag',
            behavior: 'none',
            position: {
              lineNumber: inlayHint.end_position.Line,
              column: inlayHint.end_position.Column
            }
          })
        }
        return hints
      }
    })
  }

  implementsAttentionHintProvider(
    model: TextModel,
    setHints: (hints: AttentionHintDecoration[]) => void,
    ctx: {
      signal: AbortSignal
    }
  ): void {
    this.compiler
      .getDiagnostics(this.currentFilename, this.getProjectAllCodes())
      .then((diagnostics) => {
        if (ctx.signal.aborted) return
        this.state.diagnostics = diagnostics
        setHints(
          diagnostics.map((diagnostic) => {
            const word = model.getWordAtPosition({
              lineNumber: diagnostic.line,
              column: diagnostic.column
            })

            return {
              level: AttentionHintLevelEnum.ERROR,
              message: diagnostic.message,
              range: {
                startColumn: diagnostic.column,
                startLineNumber: diagnostic.line,
                endColumn: word?.endColumn ?? diagnostic.column,
                endLineNumber: diagnostic.line
              },
              hoverContent: {
                type: 'doc',
                layer: {
                  level: DocPreviewLevel.Error,
                  content: diagnostic.message
                }
              }
            }
          })
        )
      })
  }

  getProjectAllCodes() {
    const spritesCodes = this.project.sprites.map((sprite) => ({
      filename: sprite.name + '.spx',
      content: sprite.code
    }))

    const stageCodes = [{ filename: 'main.spx', content: this.project.stage.code }]

    return [...spritesCodes, ...stageCodes]
  }

  async implementsInputAssistantProvider(_ctx: {
    signal: AbortSignal
  }): Promise<InputItemCategory[]> {
    return getInputItemCategories(this.project)
  }

  private async _updateDefinition() {
    const definition = await this.compiler.getDefinition(
      this.currentFilename,
      this.getProjectAllCodes()
    )
    this.state.definitions = definition
  }

  public jump(position: JumpPosition): void {}
}

function getCompletionItems(i18n: I18n, project: Project): CompletionItem[] {
  const items: CompletionItem[] = [
    ...keywords.map((keyword) => ({
      label: keyword,
      insertText: keyword,
      icon: Icon.Keywords,
      desc: '',
      preview: {
        type: 'doc' as const,
        layer: {
          level: DocPreviewLevel.Normal,
          content: ''
        }
      }
    })),
    ...typeKeywords.map((typeKeyword) => ({
      label: typeKeyword,
      insertText: typeKeyword,
      icon: Icon.Keywords,
      desc: '',
      preview: {
        type: 'doc' as const,
        layer: {
          level: DocPreviewLevel.Normal,
          content: ''
        }
      }
    }))
  ]
  for (const tool of getAllTools(project)) {
    const basics = {
      label: tool.keyword,
      icon: getCompletionItemKind(tool.type),
      preview: {
        type: 'doc' as const,
        layer: {
          level: DocPreviewLevel.Normal,
          content: ''
        }
      }
    }
    if (tool.usage != null) {
      items.push({
        ...basics,
        insertText: tool.usage.insertText,
        desc: i18n.t(tool.desc)
      })
      continue
    }
    for (const usage of tool.usages!) {
      items.push({
        ...basics,
        insertText: usage.insertText,
        desc: [i18n.t(tool.desc), i18n.t(usage.desc)].join(' - ')
      })
    }
  }
  return items
}

function getCompletionItemKind(type: TokenType): Icon {
  switch (type) {
    case TokenType.method:
      return Icon.Function
    case TokenType.function:
      return Icon.Function
    case TokenType.constant:
      return Icon.Prototype
    case TokenType.keyword:
      return Icon.Keywords
    case TokenType.variable:
      return Icon.Prototype
  }
}

function toolCategory2InputItemCategory(
  category: TokenCategory,
  icon: Icon,
  color: string
): InputItemCategory {
  return {
    icon,
    color,
    label: category.label,
    groups: category.groups.map((group) => ({
      label: group.label,
      inputItems: group.tools.flatMap((tool): InputItem[] => {
        //TODO: get token detail from compiler
        //TODO: get token detail from doc
        if (tool.usage) {
          let sample = tool.usage.insertText.split(' ').slice(1).join()
          sample = sample.replace(
            /\$\{\d+:?(.*?)}/g,
            (_, placeholderContent: string) => placeholderContent || ''
          )
          return [
            {
              icon: getCompletionItemKind(tool.type),
              label: tool.keyword,
              desc: {
                type: 'doc',
                layer: {
                  level: DocPreviewLevel.Normal,
                  content: ''
                }
              },
              sample: sample,
              insertText: tool.usage.insertText
            }
          ]
        } else if (Array.isArray(tool.usages)) {
          return tool.usages.map((usage) => {
            let sample = usage.insertText.split(' ').slice(1).join(' ')
            sample = sample.replace(
              /\$\{\d+:?(.*?)}/g,
              (_, placeholderContent: string) => placeholderContent || ''
            )
            return {
              icon: getCompletionItemKind(tool.type),
              label: tool.keyword,
              desc: {
                type: 'doc',
                layer: {
                  level: DocPreviewLevel.Normal,
                  content: ''
                }
              },
              sample: sample,
              insertText: usage.insertText
            }
          })
        }
        return []
      })
    }))
  }
}

function getInputItemCategories(project: Project): InputItemCategory[] {
  return [
    toolCategory2InputItemCategory(eventCategory, Icon.Event, '#fabd2c'),
    toolCategory2InputItemCategory(lookCategory, Icon.Look, '#fd8d60'),
    toolCategory2InputItemCategory(motionCategory, Icon.Motion, '#91d644'),
    toolCategory2InputItemCategory(controlCategory, Icon.Control, '#3fcdd9'),
    toolCategory2InputItemCategory(sensingCategory, Icon.Sensing, '#4fc2f8'),
    toolCategory2InputItemCategory(soundCategory, Icon.Sound, '#a074ff'),
    toolCategory2InputItemCategory(getVariableCategory(project), Icon.Variable, '#5a7afe'),
    toolCategory2InputItemCategory(gameCategory, Icon.Game, '#e14e9f')
  ]
}
