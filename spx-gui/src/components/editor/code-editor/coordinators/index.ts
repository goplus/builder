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
import { CodeEnum, Compiler } from '../compiler'
import { ChatBot } from '../chat-bot'
import { DocAbility } from '../document'
import { Project } from '@/models/project'
import { type IRange, type Position } from 'monaco-editor'
import type { I18n } from '@/utils/i18n'
import { keywords, typeKeywords } from '@/utils/spx'
import {
  controlCategory,
  eventCategory,
  gameCategory,
  getAllTools,
  getVariableCategory,
  lookCategory,
  motionCategory,
  sensingCategory,
  soundCategory,
  TokenType,
  type TokenCategory
} from '@/components/editor/code-editor/tools'

type JumpPosition = {
  line: number
  column: number
  fileUri: string
}

export class Coordinator {
  project: Project
  ui: EditorUI
  chatBot: ChatBot
  docAbility: DocAbility
  compiler: Compiler

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

    ui.registerCompletionProvider({
      // do not use `provideDynamicCompletionItems: this.implementsPreDefinedCompletionProvider` this will change `this` pointer to `{provideDynamicCompletionItems: ()=> void}`
      // and throw undefined error
      provideDynamicCompletionItems: this.implementsPreDefinedCompletionProvider.bind(this)
    })

    ui.registerHoverProvider({
      provideHover: this.implementsPreDefinedHoverProvider.bind(this)
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

  async implementsPreDefinedHoverProvider(
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

    if (!contents || contents.length === 0) {
      return []
    }

    return contents.map((doc) => ({
      level: DocPreviewLevel.Normal,
      content: doc.content,
      recommendAction: {
        label: this.ui.i18n.t({ zh: '还有疑惑？场外求助', en: 'Still in confusion? Ask for help' }),
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
    }))
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
          const chat = this.chatBot.startExplainChat(ctx.selectContent, this.project)
          this.ui.invokeAIChatModal(chat)
        }
      },
      {
        icon: Icon.AIAbility,
        label: this.ui.i18n.t({ zh: '这段代码无法正常运行', en: 'This code cannot run properly' }),
        action: () => {
          const chat = this.chatBot.startFixCodeChat(ctx.selectContent, this.project)
          this.ui.invokeAIChatModal(chat)
        }
      },
      {
        icon: Icon.AIAbility,
        label: this.ui.i18n.t({ zh: '给这段代码添加注释', en: 'Add explanation to this code' }),
        action: () => {
          const chat = this.chatBot.startCommentChat(ctx.selectContent, this.project)
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
    const inlayHints = await this.compiler.getInlayHints([
      {
        type: this.project.selectedSprite ? CodeEnum.Sprite : CodeEnum.Stage,
        content: model.getValue()
      }
    ])

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
      .getDiagnostics([
        {
          type: this.project.selectedSprite ? CodeEnum.Sprite : CodeEnum.Stage,
          content: model.getValue()
        }
      ])
      .then((attentionHints) => {
        setHints(
          attentionHints.map((attentionHint) => {
            const word = model.getWordAtPosition({
              lineNumber: attentionHint.line,
              column: attentionHint.column
            })

            return {
              level: AttentionHintLevelEnum.ERROR,
              message: attentionHint.message,
              range: {
                startColumn: attentionHint.column,
                startLineNumber: attentionHint.line,
                endColumn: word?.endColumn ?? attentionHint.column,
                endLineNumber: attentionHint.line
              },
              hoverContent: {
                level: DocPreviewLevel.Error,
                content: attentionHint.message
              }
            }
          })
        )
      })
  }

  async implementsInputAssistantProvider(_ctx: {
    signal: AbortSignal
  }): Promise<InputItemCategory[]> {
    return getInputItemCategories(this.project)
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
        level: DocPreviewLevel.Normal,
        content: ''
      }
    })),
    ...typeKeywords.map((typeKeyword) => ({
      label: typeKeyword,
      insertText: typeKeyword,
      icon: Icon.Keywords,
      desc: '',
      preview: {
        level: DocPreviewLevel.Normal,
        content: ''
      }
    }))
  ]
  for (const tool of getAllTools(project)) {
    const basics = {
      label: tool.keyword,
      icon: getCompletionItemKind(tool.type),
      preview: {
        level: DocPreviewLevel.Normal,
        content: ''
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
                level: DocPreviewLevel.Normal,
                content: ''
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
                level: DocPreviewLevel.Normal,
                content: ''
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
