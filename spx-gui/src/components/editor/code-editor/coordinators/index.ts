import {
  type AttentionHintDecoration,
  AttentionHintLevelEnum,
  type CompletionItem,
  DocPreviewLevel,
  type EditorUI,
  Icon,
  type InlayHintDecoration,
  type InputItem,
  type InputItemCategory,
  type InputItemGroup,
  type SelectionMenuItem,
  type TextModel
} from '@/components/editor/code-editor/EditorUI'
import { Runtime } from '../runtime'
import type { Definition, TokenDetail, TokenUsage as CompilerTokenUsage } from '../compiler'
import { Compiler } from '../compiler'
import { ChatBot, Suggest } from '../chat-bot'
import { DocAbility } from '../document'
import { Project } from '@/models/project'
import { type IRange, type Position } from 'monaco-editor'
import {
  controlCategory,
  eventCategory,
  gameCategory,
  lookCategory,
  motionCategory,
  sensingCategory,
  soundCategory
} from '@/components/editor/code-editor/tokens/group'
import { debounce } from '@/utils/utils'
import { HoverProvider } from '@/components/editor/code-editor/coordinators/hoverProvider'
import type {
  TokenCategory,
  TokenUsage,
  UsageWithDoc
} from '@/components/editor/code-editor/tokens/types'
import { getAllTokens } from '@/components/editor/code-editor/tokens'
import type { I18n } from '@/utils/i18n'

type JumpPosition = {
  line: number
  column: number
  fileUri: string
}

export type CoordinatorState = {
  definitions: Definition[]
}

export class Coordinator {
  project: Project
  ui: EditorUI
  chatBot: ChatBot
  docAbility: DocAbility
  compiler: Compiler
  public updateDefinition = debounce(this._updateDefinition, 300)
  private coordinatorState: CoordinatorState = {
    definitions: []
  }
  private readonly hoverProvider: HoverProvider
  private suggest: Suggest

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
    this.hoverProvider = new HoverProvider(ui, docAbility, this.coordinatorState, project)
    this.suggest = new Suggest(() => project)

    ui.registerCompletionProvider({
      provideDynamicCompletionItems: this.implementsCompletionProvider.bind(this)
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

  implementsCompletionProvider(
    model: TextModel,
    ctx: {
      position: Position
      unitWord: string
      signal: AbortSignal
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    // add project variables
    const { sprites, sounds, stage, selectedSprite } = this.project

    const createCompletionItem = (name: string) => ({
      icon: Icon.Variable,
      insertText: `"${name}"`,
      label: `"${name}"`,
      desc: '',
      preview: {
        type: 'doc' as const,
        layer: {
          level: DocPreviewLevel.Normal,
          content: ''
        }
      }
    })

    const items = [
      ...sprites.map((sprite) => createCompletionItem(sprite.name)),
      ...sounds.map((sound) => createCompletionItem(sound.name)),
      ...stage.backdrops.map((backdrop) => createCompletionItem(backdrop.name))
    ]

    if (selectedSprite) {
      const { animations, costumes } = selectedSprite
      items.push(
        ...animations.map((animation) => createCompletionItem(animation.name)),
        ...costumes.map((costume) => createCompletionItem(costume.name))
      )
    }

    addItems(items)

    this.compiler
      .getCompletionItems(
        this.currentFilename,
        this.getProjectAllCodes(),
        ctx.position.lineNumber,
        ctx.position.column
      )
      .then((completionItems) => {
        addItems(
          completionItems.map((completionItem) => {
            return {
              icon: usageType2Icon(completionItem.type),
              insertText: completionItem.insertText,
              label: completionItem.label,
              desc: '',
              preview: {
                type: 'doc',
                layer: {
                  level: DocPreviewLevel.Normal,
                  content: '' /* todo: get content with docAbility */
                }
              }
            }
          })
        )
      })

    // this.suggest
    //   .startSuggestTask({
    //     code: model.getValue(),
    //     position: {
    //       line: ctx.position.lineNumber,
    //       column: ctx.position.column
    //     }
    //   })
    //   .then((items) => {
    //     addItems(
    //       items.map((item) => {
    //         return {
    //           icon: Icon.AIAbility,
    //           insertText: ctx.unitWord + item.insertText,
    //           label: ctx.unitWord + item.label,
    //           desc: ctx.unitWord + item.label,
    //           preview: {
    //             type: 'doc',
    //             layer: {
    //               level: DocPreviewLevel.Normal,
    //               content: ''
    //             }
    //           }
    //         }
    //       })
    //     )
    //   })
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

    if (ctx.signal.aborted) return []

    return inlayHints.flatMap((inlayHint): InlayHintDecoration[] => {
      // from compiler has two type of inlay hint, so here use if else to distinguish
      if (inlayHint.type === 'play') {
        return [
          {
            content: Icon.Playlist,
            style: 'icon',
            behavior: 'triggerCompletion',
            position: {
              lineNumber: inlayHint.endPosition.line,
              column: inlayHint.endPosition.column
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
              lineNumber: inlayHint.startPosition.line,
              column: inlayHint.startPosition.column
            }
          }
        ]
        if (inlayHint.unit) {
          hints.push({
            content: inlayHint.name,
            style: 'tag',
            behavior: 'none',
            position: {
              lineNumber: inlayHint.endPosition.line,
              column: inlayHint.endPosition.column
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
        setHints(
          diagnostics
            .filter((diagnostic) => diagnostic.filename === this.currentFilename)
            .map((diagnostic) => {
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

  async implementsInputAssistantProvider(ctx: {
    signal: AbortSignal
  }): Promise<InputItemCategory[]> {
    const categories = [
      { category: eventCategory, icon: Icon.Event, color: '#fabd2c' },
      { category: lookCategory, icon: Icon.Look, color: '#fd8d60' },
      { category: motionCategory, icon: Icon.Motion, color: '#91d644' },
      { category: controlCategory, icon: Icon.Control, color: '#3fcdd9' },
      { category: sensingCategory, icon: Icon.Sensing, color: '#4fc2f8' },
      { category: soundCategory, icon: Icon.Sound, color: '#a074ff' },
      { category: gameCategory, icon: Icon.Game, color: '#e14e9f' }
    ]

    const tokenList = Object.values(getAllTokens())
    const tokenDetails = await this.compiler.getTokensDetail(tokenList.map((token) => token.id))
    const tokenDetailsMap: Record<string, TokenDetail> = {}
    tokenDetails.forEach((tokenDetail) => {
      const key = `${tokenDetail.pkgPath}/${tokenDetail.name}`
      tokenDetailsMap[key] = tokenDetail
    })

    if (ctx.signal.aborted) return []
    const inputAssistant: InputItemCategory[] = new Array(categories.length)

    for (let i = 0; i < categories.length; i++) {
      if (ctx.signal.aborted) return []
      const { category, icon, color } = categories[i]
      inputAssistant[i] = await toolCategory2InputItemCategory(
        category,
        icon,
        color,
        this.ui,
        this.docAbility,
        tokenDetailsMap
      )
    }

    return inputAssistant
  }

  private async _updateDefinition() {
    this.coordinatorState.definitions = await this.compiler.getDefinition(
      this.currentFilename,
      this.getProjectAllCodes()
    )
  }

  public jump(position: JumpPosition): void {}
}

async function toolCategory2InputItemCategory(
  category: TokenCategory,
  icon: Icon,
  color: string,
  ui: EditorUI,
  docAbility: DocAbility,
  tokenDetailsMap: Record<string, TokenDetail>
): Promise<InputItemCategory> {
  const inputItemGroups: InputItemGroup[] = []
  const transferUsageParam = (params: Array<{ name: string; type: string }>) =>
    params.map((param) => param.name + ' ' + param.type.split('.').pop()).join(', ')
  for (const group of category.groups) {
    const inputItems: InputItem[] = []

    for (const token of group.tokens) {
      const tokenWithDoc = await docAbility.getNormalDoc(token.id)
      const key = `${token.id.pkgPath}/${token.id.name}`
      const tokenDetail: TokenDetail | undefined = tokenDetailsMap[key]
      const tokenUsages = tokenDetail?.usages || []
      const docUsages: Array<UsageWithDoc> = tokenWithDoc.usages
      const tokenUsageIdxMap = new Map<string, number>()
      const finalUsages: Array<UsageWithDoc> = tokenUsages.map((usage, i) => {
        tokenUsageIdxMap.set(usage.usageID, i)
        return {
          ...usage,
          id: usage.usageID,
          effect: tokenDetail.structName,
          doc: '',
          declaration:
            usage.type === 'func'
              ? `${token.id.name} (${transferUsageParam(usage.params)})`
              : usage.declaration
        }
      })
      docUsages.forEach((usage) => {
        if (tokenUsageIdxMap.has(usage.id)) {
          const idx = tokenUsageIdxMap.get(usage.id)
          if (idx == null)
            throw new Error(
              'get array "finalUsages" member error for already set key "usageId", but idx is not exist'
            )
          finalUsages[idx].doc = usage.doc
          // usage effect from pre-defined is better than wasm get.
          finalUsages[idx].effect = usage.effect
        } else {
          finalUsages.push(usage)
        }
      })
      finalUsages.forEach((usage) => {
        inputItems.push({
          icon: usageType2Icon(usage.effect),
          label: token.id.name,
          sample: usage.sample,
          insertText: usage.insertText,
          desc: {
            type: 'doc',
            layer: {
              level: DocPreviewLevel.Normal,
              content: usage.doc,
              header: {
                icon: usageType2Icon(usage.effect),
                declaration: usage.declaration
              },
              recommendAction: {
                label: ui.i18n.t({
                  zh: '还有疑惑？场外求助',
                  en: 'Still in confusion? Ask for help'
                }),
                activeLabel: ui.i18n.t({ zh: '在线答疑', en: 'Online Q&A' }),
                onActiveLabelClick: () => {
                  // TODO: add some logic code here
                }
              },
              moreActions: [
                {
                  icon: Icon.Document,
                  label: ui.i18n.t({ zh: '查看文档', en: 'Document' }),
                  onClick: () => {
                    const usageId = usage.id
                    docAbility.getDetailDoc(token.id).then((detailDoc) => {
                      const usageDetailDoc = detailDoc.usages.find(
                        (usage: UsageWithDoc) => usage.id === usageId
                      )?.doc
                      if (!usageDetailDoc)
                        return console.warn(
                          'usageDetailDoc not found. tokenId: ' +
                            JSON.stringify(token.id) +
                            ' usageId: ' +
                            usageId
                        )
                      ui.invokeDocumentDetail(usageDetailDoc)
                    })
                  }
                }
              ]
            }
          }
        })
      })
    }

    inputItemGroups.push({
      label: group.label,
      inputItems: inputItems
    })
  }
  return {
    icon,
    color,
    label: category.label,
    groups: inputItemGroups
  }
}

/** transform from wasm token usage type item like 'func, keyword, bool, byte, float32, etc.' into Icon type */
// todo: add more case type transform to type
export function usageType2Icon(type: string): Icon {
  switch (type) {
    case 'func':
      return Icon.Function
    case 'keyword':
      return Icon.Property
    case 'bool':
      return Icon.Property
    default:
      return Icon.Property
  }
}
