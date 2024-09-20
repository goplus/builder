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
  type LayerContent,
  type SelectionMenuItem,
  type TextModel
} from '@/components/editor/code-editor/EditorUI'
import { Runtime } from '../runtime'
import type { Definition, TokenDetail, Hint } from '../compiler'
import { Compiler } from '../compiler'
import { ChatBot, Suggest } from '../chat-bot'
import { DocAbility } from '../document'
import { Project } from '@/models/project'
import { type IRange, type Position } from 'monaco-editor'
import { type Position as JumpPosition } from '@/models/runtime'
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
  TokenId,
  UsageWithDoc
} from '@/components/editor/code-editor/tokens/types'
import { getAllTokens } from '@/components/editor/code-editor/tokens'

export type CoordinatorState = {
  definitions: Definition[]
  inlayHints: Hint[]
}

export class Coordinator {
  project: Project
  ui: EditorUI
  chatBot: ChatBot
  docAbility: DocAbility
  compiler: Compiler
  public updateDefinition = debounce(this._updateDefinition, 300)
  private coordinatorState: CoordinatorState = {
    definitions: [],
    inlayHints: []
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
    this.hoverProvider = new HoverProvider(ui, docAbility, this.coordinatorState, project, chatBot)
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
    const transferUsageDeclaration = (declaration: string) =>
      declaration
        // if param type is func() (func(mi *github.com/goplus/spx.MovingInfo))
        // this line remove: "github.com/goplus/spx."
        .replace(/(?:[\w/]+\.)+/g, '')

    // add project variables
    const { sprites, sounds, stage, selectedSprite } = this.project

    const createCompletionItem = (name: string, preview?: LayerContent) => ({
      icon: Icon.Property,
      insertText: `"${name}"`,
      label: `"${name}"`,
      preview
    })

    const items = [
      ...sprites.map((sprite) => createCompletionItem(sprite.name)),
      ...sounds.map((sound) =>
        createCompletionItem(sound.name, {
          type: 'audio',
          layer: {
            file: sound.file
          }
        })
      ),
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
      .then(async (completionItems) => {
        // todo: this function code is running very slowly! need refactor
        const completionItemDocMap = new Map<string, UsageWithDoc>()
        for (let i = 0; i < completionItems.length; i++) {
          const completionItem = completionItems[i]
          const tokenId: TokenId = {
            pkgPath: completionItem.tokenPkg,
            name: completionItem.tokenName
          }
          const { usages } = await this.docAbility.getNormalDoc(tokenId)
          usages.forEach((usage: UsageWithDoc) => completionItemDocMap.set(usage.insertText, usage))
        }
        addItems(
          completionItems.map((completionItem) => {
            const completionItemDoc = completionItemDocMap.get(completionItem.insertText)
            if (!completionItemDoc)
              return {
                icon: usageType2Icon(completionItem.type),
                insertText: completionItem.insertText,
                label: completionItem.label
              }
            return {
              icon: usageType2Icon(completionItem.type),
              insertText: completionItem.insertText,
              label: completionItem.label,
              preview: {
                type: 'doc',
                layer: {
                  level: DocPreviewLevel.Normal,
                  content: completionItemDoc.doc,
                  header: {
                    icon: usageEffect2Icon(completionItemDoc.effect),
                    declaration: transferUsageDeclaration(completionItemDoc.declaration)
                  },
                  recommendAction: {
                    label: this.ui.i18n.t({
                      zh: '还有疑惑？场外求助',
                      en: 'Still in confusion? Ask for help'
                    }),
                    activeLabel: this.ui.i18n.t({ zh: '在线答疑', en: 'Online Q&A' }),
                    onActiveLabelClick: () => {
                      if (completionItemDoc.doc) {
                        const chat = this.chatBot.startExplainChat('\n\n' + completionItemDoc.doc)
                        this.ui.invokeAIChatModal(chat)
                      } else {
                        const chat = this.chatBot.startExplainChat(
                          transformInput2MarkdownCode(completionItemDoc.declaration)
                        )
                        this.ui.invokeAIChatModal(chat)
                      }
                    }
                  },
                  moreActions: [
                    {
                      icon: Icon.Document,
                      label: this.ui.i18n.t({ zh: '查看文档', en: 'Document' }),
                      onClick: () => {
                        const usageId = completionItemDoc.id
                        this.docAbility
                          .getDetailDoc({
                            name: completionItem.tokenName,
                            pkgPath: completionItem.tokenPkg
                          })
                          .then((detailDoc) => {
                            const usageDetailDoc = detailDoc.usages.find(
                              (usage: UsageWithDoc) => usage.id === usageId
                            )?.doc
                            if (usageDetailDoc) return this.ui.invokeDocumentDetail(usageDetailDoc)
                            console.warn(
                              'usageDetailDoc not found. tokenId: ' +
                                JSON.stringify({
                                  name: completionItem.tokenName,
                                  pkgPath: completionItem.tokenPkg
                                }) +
                                ' usageId: ' +
                                usageId
                            )
                          })
                      }
                    }
                  ]
                }
              }
            }
          })
        )
      })

    function getContextualCode(
      code: string,
      position: { line: number; column: number },
      numLines: number
    ) {
      const lines = code.split('\n')

      const startLine = Math.max(0, position.line - numLines)
      const endLine = Math.min(lines.length - 1, position.line + numLines)

      const contextualLines = lines.slice(startLine, endLine + 1)

      return contextualLines.join('\n')
    }

    const code = model.getValue()
    const position = {
      line: ctx.position.lineNumber,
      column: ctx.position.column
    }
    const numLines = 3
    const contextualCode = getContextualCode(code, position, numLines)

    this.suggest
      .startSuggestTask({
        code: contextualCode,
        position: {
          line: position.line,
          column: position.column
        }
      })
      .then((items) => {
        addItems(
          items.map((item) => {
            return {
              icon: Icon.AIAbility,
              insertText: item.insertText,
              label: ctx.unitWord + item.label
            }
          })
        )
      })
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
          const chat = this.chatBot.startExplainChat(transformInput2MarkdownCode(ctx.selectContent))
          this.ui.invokeAIChatModal(chat)
        }
      },
      {
        icon: Icon.AIAbility,
        label: this.ui.i18n.t({ zh: '这段代码无法正常运行', en: 'This code cannot run properly' }),
        action: () => {
          const chat = this.chatBot.startFixCodeChat(transformInput2MarkdownCode(ctx.selectContent))
          this.ui.invokeAIChatModal(chat)
        }
      },
      {
        icon: Icon.AIAbility,
        label: this.ui.i18n.t({ zh: '给这段代码添加注释', en: 'Add explanation to this code' }),
        action: () => {
          const chat = this.chatBot.startCommentChat(transformInput2MarkdownCode(ctx.selectContent))
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
    this.coordinatorState.inlayHints = inlayHints
    return inlayHints.flatMap((inlayHint): InlayHintDecoration[] => {
      if (inlayHint.type === 'play') return []
      // todo: this is temp way to show playlistIcon, need a better way to identify
      if (inlayHint.name === 'mediaName') {
        return [
          {
            content: Icon.Playlist,
            style: 'icon',
            behavior: 'triggerCompletion',
            position: {
              lineNumber: inlayHint.startPosition.line,
              column: inlayHint.startPosition.column
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
                        const chat = this.chatBot.startFixCodeChat(diagnostic.message)
                        this.ui.invokeAIChatModal(chat)
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
        tokenDetailsMap,
        !this.project.selectedSprite,
        this.chatBot
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

  public jump(position: JumpPosition): void {
    if (!position.ableToJump) return
    // here temp using completion editor instance
    // in fact all features in this ui have same editor instance
    const editor = this.ui.completionMenu?.editor
    editor?.setPosition({
      column: position.column,
      lineNumber: position.line
    })
    editor?.focus()
  }
}

/*  todo: this function params length need refactor to config object */
async function toolCategory2InputItemCategory(
  category: TokenCategory,
  icon: Icon,
  color: string,
  ui: EditorUI,
  docAbility: DocAbility,
  tokenDetailsMap: Record<string, TokenDetail>,
  isInStageCode: boolean,
  chatBot: ChatBot
): Promise<InputItemCategory> {
  const inputItemGroups: InputItemGroup[] = []
  const transferUsageDeclaration = (declaration: string) =>
    declaration
      // if param type is func() (func(mi *github.com/goplus/spx.MovingInfo))
      // this line remove: "github.com/goplus/spx."
      .replace(/(?:[\w/]+\.)+/g, '')
  for (const group of category.groups) {
    const inputItems: InputItem[] = []
    for (const token of group.tokens) {
      const tokenWithDoc = await docAbility.getNormalDoc(token.id)
      const key = `${token.id.pkgPath}/${token.id.name}`
      const tokenDetail: TokenDetail | undefined = tokenDetailsMap[key]

      const tokenUsages = tokenDetail?.usages || []
      const docUsages: Array<UsageWithDoc> = tokenWithDoc.usages

      const docUsageIdxMap = new Map<string, number>()
      // current logic is only show document, not shown all wasm usages.

      // collect all usages from document and next get wasm usage to merge it.
      const finalUsages: Array<UsageWithDoc> = docUsages
      docUsages.forEach((usage, i) => docUsageIdxMap.set(usage.id, i))
      // here is wasm usage merge doc usage to full finalUsages
      tokenUsages.forEach((usage) => {
        const idx = docUsageIdxMap.get(usage.usageID)
        // for number 0 is falsy, can not use `if (idx)`
        if (idx == null) return
        finalUsages[idx].declaration = transferUsageDeclaration(finalUsages[idx].declaration)
      })

      finalUsages
        // this filter is used find usage to match current Sprite Code or Stage Code
        .filter((usage) => {
          if (!isInStageCode) return true
          // some effect may empty but pre-defined in tokens like if, function, const, etc.
          if (!usage.target && token.id.pkgPath === 'gop') return true
          return ['All', 'Stage'].includes(usage.target)
        })
        .forEach((usage) => {
          inputItems.push({
            icon: usageEffect2Icon(usage.effect),
            label: token.id.name,
            sample: usage.sample,
            insertText: usage.insertText,
            desc: {
              type: 'doc',
              layer: {
                level: DocPreviewLevel.Normal,
                content: usage.doc,
                header: {
                  icon: usageEffect2Icon(usage.effect),
                  // if some usage is from wasm, also need to transform declaration
                  // you can remove `tokenUsages` related logic and only keep this line code
                  declaration: transferUsageDeclaration(usage.declaration)
                },
                recommendAction: {
                  label: ui.i18n.t({
                    zh: '还有疑惑？场外求助',
                    en: 'Still in confusion? Ask for help'
                  }),
                  activeLabel: ui.i18n.t({ zh: '在线答疑', en: 'Online Q&A' }),
                  onActiveLabelClick: () => {
                    if (usage.doc) {
                      const chat = chatBot.startExplainChat('\n\n' + usage.doc)
                      ui.invokeAIChatModal(chat)
                    } else {
                      const chat = chatBot.startExplainChat(
                        transformInput2MarkdownCode(usage.declaration)
                      )
                      ui.invokeAIChatModal(chat)
                    }
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
                        if (usageDetailDoc) return ui.invokeDocumentDetail(usageDetailDoc)
                        console.warn(
                          'usageDetailDoc not found. tokenId: ' +
                            JSON.stringify(token.id) +
                            ' usageId: ' +
                            usageId
                        )
                      })
                    }
                  }
                ]
              }
            }
          })
        })
    }

    if (!inputItems.length) continue
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

/** transform pre-defined token usage effect into Icon type */
export function usageEffect2Icon(effect: string): Icon {
  switch (effect) {
    case 'read':
      return Icon.Read
    case 'listen':
      return Icon.Listen
    case 'func':
      return Icon.Function
    default:
      return Icon.Function
  }
}

/* transform wasm token usage type item like 'func, keyword, bool, byte, float32, etc.'  */
export function usageType2Icon(type: string): Icon {
  switch (type) {
    case 'code':
      return Icon.Code
    case 'keyword':
      return Icon.Write
    case 'bool':
      return Icon.Read
    // todo: add more case type transform to Icon type
    default:
      return Icon.Function
  }
}

/* transform wasm definition structName item like 'Sound, Game, Camera, etc.' into TokenUsage Target  */
export function definitionStructName2Target(structName: string): 'All' | 'Sprite' | 'Stage' {
  switch (structName) {
    case 'Game':
      return 'Stage'
    default:
      return 'All'
  }
}

export function transformInput2MarkdownCode(input: string) {
  return '\n```gop  \n' + input + '\n```'
}
