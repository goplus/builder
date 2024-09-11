import type { EditorUI, LayerContent, TextModel } from '@/components/editor/code-editor/EditorUI'
import { DocPreviewLevel, Icon } from '@/components/editor/code-editor/EditorUI'
import { DocAbility } from '@/components/editor/code-editor/document'
import type { Position } from 'monaco-editor'
import type { Definition, DefinitionUsage } from '@/components/editor/code-editor/compiler'
import type { CoordinatorState } from '@/components/editor/code-editor/coordinators/index'
import type { Doc, TokenUsage, UsageWithDoc } from '@/components/editor/code-editor/tokens/common'
import { usageType2Icon } from '@/components/editor/code-editor/coordinators/index'

export class HoverProvider {
  private ui: EditorUI
  private docAbility: DocAbility
  private coordinatorState: CoordinatorState

  constructor(ui: EditorUI, docAbility: DocAbility, coordinatorState: CoordinatorState) {
    this.ui = ui
    this.docAbility = docAbility
    this.coordinatorState = coordinatorState
  }

  async provideHover(
    _model: TextModel,
    ctx: {
      position: Position
      hoverUnitWord: string
      signal: AbortSignal
    }
  ): Promise<LayerContent[]> {
    const definition = this.findDefinition(ctx.position)
    if (!definition) return []

    const content = await this.docAbility.getNormalDoc({
      id: {
        module: definition.pkg_path,
        name: definition.name
      },
      usages: definition.usages.map(
        (usage): TokenUsage => ({
          id: usage.usageID,
          effect: usage.type,
          declaration: usage.declaration,
          sample: usage.sample,
          insertText: usage.insert_text
        })
      )
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
    return (
      definition.pkg_name === 'main' &&
      definition.pkg_path === 'main' &&
      definition.usages.length === 1
    )
  }

  private findDefinition(position: Position): Definition | undefined {
    return this.coordinatorState.definitions.find((definition) => {
      const tokenLen = definition.end_pos - definition.start_pos
      const line = definition.start_position.Line
      const startColumn = definition.start_position.Column
      const endColumn = startColumn + tokenLen
      return (
        position.lineNumber === line &&
        position.column >= startColumn &&
        position.column <= endColumn
      )
    })
  }

  private createVariableRenameContent(usage: DefinitionUsage): LayerContent {
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

  private createDocContents(doc: Doc, definition: Definition): LayerContent[] {
    const declarations = this.createDefinitionDeclaration(definition)
    return doc.usages.map((usage: UsageWithDoc) => ({
      type: 'doc',
      layer: {
        level: DocPreviewLevel.Normal,
        header: {
          icon: usageType2Icon(usage.effect),
          declaration: declarations[usage.id] || usage.declaration
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

  private createDocDetailAction(doc: Doc, definition: Definition) {
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
          this.docAbility.getDetailDoc(doc).then((detailDoc) => {
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
