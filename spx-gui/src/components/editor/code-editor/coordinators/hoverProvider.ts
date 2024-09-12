import type { EditorUI, LayerContent, TextModel } from '@/components/editor/code-editor/EditorUI'
import { DocPreviewLevel, Icon } from '@/components/editor/code-editor/EditorUI'
import { DocAbility } from '@/components/editor/code-editor/document'
import type { Position } from 'monaco-editor'
import type { Definition, TokenUsage } from '@/components/editor/code-editor/compiler'
import type { CoordinatorState } from '@/components/editor/code-editor/coordinators/index'
import type { TokenWithDoc, UsageWithDoc } from '@/components/editor/code-editor/tokens/types'
import { usageType2Icon } from '@/components/editor/code-editor/coordinators/index'
import type { Project } from '@/models/project'

export class HoverProvider {
  private ui: EditorUI
  private docAbility: DocAbility
  private coordinatorState: CoordinatorState

  constructor(ui: EditorUI, docAbility: DocAbility, coordinatorState: CoordinatorState, private project: Project) {
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
    if (!definition) return []

    const content = await this.docAbility.getNormalDoc({
      pkgPath: definition.pkgPath,
      name: definition.name
    })

    const layerContents: LayerContent[] = []
    if (this.isDefinitionCanBeRenamed(definition)) {
      const [usage] = definition.usages
      if (!usage) throw new Error('definition should have one usage!')
      layerContents.push(this.createVariableRenameContent(usage))
    } else {
      layerContents.push(...this.createDocContents(content, definition))
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

  private createVariableRenameContent(usage: TokenUsage): LayerContent {
    return {
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Normal,
        header: {
          icon: usageType2Icon(usage.type),
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

  private createDocContents(doc: TokenWithDoc, definition: Definition): LayerContent[] {
    const declarationMap = this.createDefinitionDeclaration(definition)
    const usages: UsageWithDoc[] = []
    const docUsageIdSet = new Set<string>()
    // if length equals 1, means matched usage
    if (definition.usages.length === 1) {
      const usage = definition.usages[0]
      const usageWithDoc = doc.usages.find((_usage: UsageWithDoc) => (usage.usageID = _usage.id))
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
  private createDefinitionDeclaration(definition: Definition) {
    const usageDeclaration: Record<string, string> = {}
    definition.usages.forEach((usage) => {
      const params = usage.params
        .map((param) => param.name + ' ' + param.type.split('.').pop())
        .join(', ')
      if (usage.type === 'func') usageDeclaration[usage.usageID] = `${definition.name} (${params})`
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
