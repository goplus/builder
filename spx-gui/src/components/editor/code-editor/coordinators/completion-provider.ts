import {
  type CompletionItem,
  DocPreviewLevel,
  type EditorUI,
  Icon,
  type LayerContent,
  type TextModel
} from '@/components/editor/code-editor/EditorUI'
import { DocAbility } from '@/components/editor/code-editor/document'
import {
  type CoordinatorState,
  transformInput2MarkdownCode,
  usageEffect2Icon,
  usageType2Icon
} from '@/components/editor/code-editor/coordinators/index'
import type { Project } from '@/models/project'
import { type ChatBot, Suggest } from '@/components/editor/code-editor/chat-bot'
import { type IPosition, type Position } from 'monaco-editor'
import type { TokenId, UsageWithDoc } from '@/components/editor/code-editor/tokens/types'
import type { Compiler } from '@/components/editor/code-editor/compiler'

export class CompletionProvider {
  constructor(
    private ui: EditorUI,
    private docAbility: DocAbility,
    private coordinatorState: CoordinatorState,
    private project: Project,
    private chatBot: ChatBot,
    private compiler: Compiler,
    private suggest: Suggest
  ) {}

  private get currentFilename() {
    return (this.project.selectedSprite?.name ?? 'main') + '.spx'
  }

  private getProjectAllCodes() {
    const spritesCodes = this.project.sprites.map((sprite) => ({
      filename: sprite.name + '.spx',
      content: sprite.code
    }))

    const stageCodes = [{ filename: 'main.spx', content: this.project.stage.code }]

    return [...spritesCodes, ...stageCodes]
  }

  private createCompletionItem(name: string, preview?: LayerContent) {
    return {
      icon: Icon.Property,
      insertText: `"${name}"`,
      label: `"${name}"`,
      preview
    }
  }

  private getContextualCode(
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

  provideCompletion(
    model: TextModel,
    ctx: {
      position: Position
      unitWord: string
      signal: AbortSignal
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    let isSyncCodeDone = false
    const syncCacheItems: CompletionItem[] = []

    // for each `addItems` will close completion menu and reopen it, to reduce this case, we collect sync items and batch add them
    const batchAddItems = (items: CompletionItem[]) => {
      if (isSyncCodeDone) return addItems([...items, ...syncCacheItems])
      syncCacheItems.push(...items)
    }

    const finishSyncCodeCall = () => {
      isSyncCodeDone = true
      batchAddItems([])
      syncCacheItems.length = 0
    }

    this.resolveProjectSuggest(model, ctx, batchAddItems)
    // this.resolveAISuggest(model, ctx, batchAddItems)
    this.resolveSoundListSuggest(model, ctx, batchAddItems)
    this.resolveCompilerSuggest(model, ctx, batchAddItems)

    finishSyncCodeCall()
  }

  resolveCompilerSuggest(
    model: TextModel,
    ctx: {
      position: IPosition
      signal: AbortSignal
      unitWord: string
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    const transferUsageDeclaration = (declaration: string) =>
      declaration
        // if param type is func() (func(mi *github.com/goplus/spx.MovingInfo))
        // this line remove: "github.com/goplus/spx."
        .replace(/(?:[\w/]+\.)+/g, '')
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
  }

  resolveSoundListSuggest(
    model: TextModel,
    ctx: {
      position: IPosition
      signal: AbortSignal
      unitWord: string
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    // resolve completion menu sound items
    const matchedHint = this.coordinatorState.inlayHints.find((hint) => {
      return (
        hint.startPosition.filename === this.currentFilename &&
        hint.startPosition.line === ctx.position.lineNumber &&
        // sometimes position has one offset to real token position
        (hint.startPosition.column === ctx.position.column + 1 ||
          hint.startPosition.column === ctx.position.column)
      )
    })
    if (matchedHint?.name !== 'mediaName') return
    const { sounds } = this.project
    // attention! here modified EditorUI member `completionMenu` inner state! is it right?
    if (this.ui.completionMenu?.completionMenuState.triggerMode.type === 'playlist') {
      this.ui.completionMenu.completionMenuState.triggerMode.range = {
        startLineNumber: matchedHint.startPosition.line,
        endLineNumber: matchedHint.endPosition.line,
        startColumn: matchedHint.startPosition.column,
        endColumn: matchedHint.endPosition.column
      }
    }
    addItems(
      sounds.map((sound) =>
        this.createCompletionItem(sound.name, {
          type: 'audio',
          layer: {
            file: sound.file
          }
        })
      )
    )
  }

  resolveProjectSuggest(
    _model: TextModel,
    _ctx: {
      position: IPosition
      signal: AbortSignal
      unitWord: string
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    // add project variables
    const { sprites, stage, selectedSprite } = this.project

    const items = [
      ...sprites.map((sprite) => this.createCompletionItem(sprite.name)),
      ...stage.backdrops.map((backdrop) => this.createCompletionItem(backdrop.name))
    ]

    if (selectedSprite) {
      const { animations, costumes } = selectedSprite
      items.push(
        ...animations.map((animation) => this.createCompletionItem(animation.name)),
        ...costumes.map((costume) => this.createCompletionItem(costume.name))
      )
    }

    addItems(items)
  }

  resolveAISuggest(
    model: TextModel,
    ctx: {
      position: IPosition
      signal: AbortSignal
      unitWord: string
    },
    addItems: (items: CompletionItem[]) => void
  ) {
    const code = model.getValue()
    const position = {
      line: ctx.position.lineNumber,
      column: ctx.position.column
    }

    const contextualCode = this.getContextualCode(code, position, 3)

    this.suggest
      .startSuggestTask({
        code: contextualCode,
        position: {
          line: position.line,
          column: position.column
        }
      })
      .then((items) => {
        if (ctx.signal.aborted) return
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
}
