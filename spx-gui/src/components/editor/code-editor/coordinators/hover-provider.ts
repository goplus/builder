import {
  DocPreviewLevel,
  type EditorUI,
  Icon,
  type LayerContent,
  type TextModel
} from '@/components/editor/code-editor/EditorUI'
import { DocAbility } from '@/components/editor/code-editor/document'
import type { Position } from 'monaco-editor'
import type { Definition, TokenUsage } from '@/components/editor/code-editor/compiler'
import {
  type CoordinatorState,
  definitionStructName2Target,
  transformInput2MarkdownCode,
  usageType2Icon
} from '@/components/editor/code-editor/coordinators/index'
import type { TokenWithDoc, UsageWithDoc } from '@/components/editor/code-editor/tokens/types'
import { usageEffect2Icon } from '@/components/editor/code-editor/coordinators/index'
import type { Project } from '@/models/project'
import type { Sound } from '@/models/sound'
import { File } from '@/models/common/file'
import type { ChatBot } from '@/components/editor/code-editor/chat-bot'

export class HoverProvider {
  constructor(
    private ui: EditorUI,
    private docAbility: DocAbility,
    private coordinatorState: CoordinatorState,
    private project: Project,
    private chatBot: ChatBot
  ) {}

  private get currentFilename() {
    return (this.project.selectedSprite?.name ?? 'main') + '.spx'
  }

  async provideHover(
    _model: TextModel,
    ctx: {
      position: Position
      hoverUnitWord: string
      signal: AbortSignal
    }
  ): Promise<LayerContent[]> {
    const definition = this.findDefinition(this.currentFilename, ctx.position)
    const sound = this.findMediaName(this.currentFilename, ctx.position)
    if (!definition && !sound) return []
    const layerContents: LayerContent[] = []
    if (definition) {
      const content = await this.docAbility.getNormalDoc({
        pkgPath: definition.pkgPath,
        name: definition.name
      })

      if (this.isDefinitionCanBeRenamed(definition)) {
        const [usage] = definition.usages
        if (!usage) throw new Error('definition should have at least one usage!')
        layerContents.push(this.createVariableRenameContent(usage, definition))
      } else {
        layerContents.push(...this.createDocContents(content, definition))
      }
    }

    if (sound) layerContents.push(this.createAudioContent(sound.file))

    return layerContents
  }

  private isDefinitionCanBeRenamed(definition: Definition) {
    return definition.pkgName === 'main' && definition.usages.length === 1
  }

  private findDefinition(filename: string, position: Position): Definition | undefined {
    return this.coordinatorState.definitions.find((definition) => {
      if (definition.startPosition.filename !== filename) return false
      const tokenLen = definition.endPos - definition.startPos
      const line = definition.startPosition.line
      const startColumn = definition.startPosition.column
      const endColumn = startColumn + tokenLen
      return (
        position.lineNumber === line &&
        position.column >= startColumn &&
        position.column <= endColumn
      )
    })
  }

  private findMediaName(filename: string, position: Position): Sound | undefined {
    const hint = this.coordinatorState.inlayHints.find((inlayHint) => {
      if (inlayHint.startPosition.filename !== filename) return false
      const tokenLen = inlayHint.endPos - inlayHint.startPos
      const line = inlayHint.startPosition.line
      const startColumn = inlayHint.startPosition.column
      const endColumn = startColumn + tokenLen
      return (
        position.lineNumber === line &&
        position.column >= startColumn &&
        position.column <= endColumn &&
        inlayHint.name === 'mediaName'
      )
    })
    if (!hint) return
    return this.project.sounds.find((sound) => `"${sound.name}"` === hint.value)
  }

  private createAudioContent(audioFile: File): LayerContent {
    return {
      type: 'audio',
      layer: {
        file: audioFile
      }
    }
  }

  private createVariableRenameContent(usage: TokenUsage, definition: Definition): LayerContent {
    // if this is function we need remap declaration
    const declarationMap = this.createDefinitionDeclaration(definition.name, [usage])
    return {
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Normal,
        header: {
          // in this rename case may not have doc usage, use definition usage type to get icon
          icon: usageType2Icon(usage.type),
          declaration: declarationMap[usage.usageID] || usage.declaration
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

  private createDocContents(doc: TokenWithDoc, definition: Definition): LayerContent[] {
    const declarationMap = this.createDefinitionDeclaration(definition.name, definition.usages)
    const usages: UsageWithDoc[] = []
    const docUsageIdSet = new Set<string>()
    // if length equals 1, means matched usage
    if (definition.usages.length === 1) {
      const usage = definition.usages[0]
      const usageWithDoc = doc.usages.find((_usage: UsageWithDoc) => usage.usageID === _usage.id)
      if (usageWithDoc) {
        usages.push({ ...usage, ...usageWithDoc })
      } else {
        // this case is some usage from wasm without pre-defined token usage effect, may use type(func, string, bool) to determine which effect(read, write, listen, func) is
        usages.push({
          ...usage,
          id: usage.usageID,
          effect: usage.type,
          target: definitionStructName2Target(definition.structName),
          doc: ''
        })
      }
    } else {
      doc.usages.forEach((usage: UsageWithDoc) => {
        usages.push(usage)
        docUsageIdSet.add(usage.id)
      })
      definition.usages
        .filter((usage) => !docUsageIdSet.has(usage.usageID))
        .forEach((usage) =>
          // this case is some usage from wasm without pre-defined token usage effect, may use type(func, string, bool) to determine which effect(read, write, listen, func) is
          usages.push({
            ...usage,
            id: usage.usageID,
            effect: usage.type,
            target: definitionStructName2Target(definition.structName),
            doc: ''
          })
        )
    }

    return usages.map((usage: UsageWithDoc) => ({
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Normal,
        header: {
          icon: usageEffect2Icon(usage.effect),
          declaration: declarationMap[usage.id] || usage.declaration
        },
        content: usage.doc,
        recommendAction: {
          label: this.ui.i18n.t({
            zh: '还有疑惑？场外求助',
            en: 'Still in confusion? Ask for help'
          }),
          activeLabel: this.ui.i18n.t({ zh: '在线答疑', en: 'Online Q&A' }),
          onActiveLabelClick: () => {
            if (usage.doc) {
              const chat = this.chatBot.startExplainChat('\n' + usage.doc)
              this.ui.invokeAIChatModal(chat)
            } else {
              const chat = this.chatBot.startExplainChat(
                transformInput2MarkdownCode(usage.declaration)
              )
              this.ui.invokeAIChatModal(chat)
            }
          }
        },
        moreActions: [...this.createDocDetailAction(doc, definition)]
      }
    }))
  }

  /** this declaration only for mapping function params */
  private createDefinitionDeclaration(name: string, usages: TokenUsage[]) {
    const usageDeclaration: Record<string, string> = {}
    usages.forEach((usage) => {
      const params = usage.params
        .map(
          (param) =>
            param.name +
            ' ' +
            param.type
              // if parma type is func() (func(mi *github.com/goplus/spx.MovingInfo))
              // this line remove: "github.com/goplus/spx."
              .replace(/(?:[\w/]+\.)+/g, '')
        )
        .join(', ')
      if (usage.type === 'func') usageDeclaration[usage.usageID] = `${name} (${params})`
      else usageDeclaration[usage.usageID] = usage.declaration.replace(/(?:[\w/]+\.)+/g, '')
    })
    return usageDeclaration
  }

  private createDocDetailAction(doc: TokenWithDoc, definition: Definition) {
    if (definition.usages.length !== 1) return []
    return [
      {
        icon: Icon.Document,
        label: this.ui.i18n.t({ zh: '查看文档', en: 'Document' }),
        onClick: () => {
          const usageId: string | null = definition.usages[0].usageID
          if (!usageId)
            throw new Error(
              'definition usage is empty when search for doc detail. tokenId: ' +
                JSON.stringify(doc.id)
            )
          this.docAbility.getDetailDoc(doc.id).then((detailDoc) => {
            const usageDetailDoc = detailDoc.usages.find(
              (usage: UsageWithDoc) => usage.id === usageId
            )?.doc
            if (!usageDetailDoc)
              return console.warn(
                'usageDetailDoc not found. tokenId: ' +
                  JSON.stringify(doc.id) +
                  ' usageId: ' +
                  usageId
              )
            this.ui.invokeDocumentDetail(usageDetailDoc)
          })
        }
      }
    ]
  }
}
