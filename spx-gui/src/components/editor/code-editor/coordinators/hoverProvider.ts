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
import type { CoordinatorState } from '@/components/editor/code-editor/coordinators/index'
import { usageType2Icon } from '@/components/editor/code-editor/coordinators/index'
import type { TokenWithDoc, UsageWithDoc } from '@/components/editor/code-editor/tokens/types'
import type { Project } from '@/models/project'
import type { Sound } from '@/models/sound'
import { useAudioDuration } from '@/utils/audio'
import { untilNotNull } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'

export class HoverProvider {
  private ui: EditorUI
  private docAbility: DocAbility
  private coordinatorState: CoordinatorState

  constructor(
    ui: EditorUI,
    docAbility: DocAbility,
    coordinatorState: CoordinatorState,
    private project: Project
  ) {
    this.ui = ui
    this.docAbility = docAbility
    this.coordinatorState = coordinatorState
  }

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

    if (sound) {
      const [audioSrc] = useFileUrl(() => sound.file)
      layerContents.push(await this.createAudioContent(await untilNotNull(audioSrc)))
    }

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

  private async createAudioContent(audioSrc: string): Promise<LayerContent> {
    const { duration: _duration } = useAudioDuration(() => audioSrc)
    const duration = await untilNotNull(_duration)
    return {
      type: 'audio',
      layer: {
        duration,
        src: audioSrc
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
        usages.push({ ...usage, id: usage.usageID, effect: definition.structName, doc: '' })
      }
    } else {
      doc.usages.forEach((usage: UsageWithDoc) => {
        usages.push(usage)
        docUsageIdSet.add(usage.id)
      })
      definition.usages
        .filter((usage) => !docUsageIdSet.has(usage.usageID))
        .forEach((usage) =>
          usages.push({ ...usage, id: usage.usageID, effect: definition.structName, doc: '' })
        )
    }

    return usages.map((usage: UsageWithDoc) => ({
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Normal,
        header: {
          icon: usageType2Icon(usage.effect),
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
            // TODO: add some logic code here
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
        .map((param) => param.name + ' ' + param.type.split('.').pop())
        .join(', ')
      if (usage.type === 'func') usageDeclaration[usage.usageID] = `${name} (${params})`
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
          const usageId = definition.usages.shift()?.usageID
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
