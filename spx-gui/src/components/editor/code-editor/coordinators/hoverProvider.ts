import type { EditorUI, LayerContent, TextModel } from '@/components/editor/code-editor/EditorUI'
import { DocPreviewLevel, Icon } from '@/components/editor/code-editor/EditorUI'
import { DocAbility } from '@/components/editor/code-editor/document'
import type { Position } from 'monaco-editor'
import type { Definition, DefinitionUsage } from '@/components/editor/code-editor/compiler'
import type { CoordinatorState } from '@/components/editor/code-editor/coordinators/index'
import type { Doc, TokenUsage } from '@/components/editor/code-editor/tokens/common'

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
    const matchedContent = this.findMatchedContent(content, definition)
    // todo: refactor these code

    const layerContents: LayerContent[] = []

    if (content && content.length > 0) {
      layerContents.push(...this.createDocContents(content))
    } else if (definition.usages.length > 0) {
      // in definition, usages have only one usage
      const [usage] = definition.usages
      const content = this.canBeRenamed(definition)
        ? this.createVariableRenameContent(usage)
        : this.createDefinitionContent(usage, matchedContent)
      layerContents.push(content)
    }

    return layerContents
  }

  private canBeRenamed(definition: Definition) {
    return definition.pkg_name === 'main' && definition.pkg_name === 'main'
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

  private findMatchedContent(content: Doc | null, definition: Definition | undefined) {
    return content?.usages.find(
      (content) =>
        definition &&
        content.token.id.name === definition.pkg_name &&
        content.token.id.module === definition.pkg_path
    )
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

  private createDocContents(contents: Doc[]): LayerContent[] {
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
              this.docAbility.getDetailDoc(doc).then((detailDoc) => {
                if (!detailDoc) return
                this.ui.invokeDocumentDetail(detailDoc)
              })
            }
          }
        ]
      }
    }))
  }
}
