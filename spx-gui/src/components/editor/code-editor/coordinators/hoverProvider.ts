import type { EditorUI, LayerContent, TextModel } from '@/components/editor/code-editor/EditorUI'
import { DocPreviewLevel, Icon } from '@/components/editor/code-editor/EditorUI'
import { type Doc, DocAbility } from '@/components/editor/code-editor/document'
import type { Position } from 'monaco-editor'
import type { Definition, DefinitionUsage } from '@/components/editor/code-editor/compiler'

export class HoverProvider {
  private ui: EditorUI
  private docAbility: DocAbility
  private definitions: Definition[]

  constructor(ui: EditorUI, docAbility: DocAbility, definitions: Definition[]) {
    this.ui = ui
    this.docAbility = docAbility
    this.definitions = definitions
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

    const contents = this.docAbility.getNormalDoc({
      module: definition.pkg_path,
      name: definition.name
    })
    const matchedContent = this.findMatchedContent(contents, definition)
    // todo: refactor these code
    if (matchedContent) return this.createDocContents([matchedContent])

    const layerContents: LayerContent[] = []

    if (contents && contents.length > 0) {
      layerContents.push(...this.createDocContents(contents))
    } else if (definition.usages.length > 0) {
      // in definition, usages have only one usage
      const [usage] = definition.usages
      const content = this.canBeRenamed()
        ? this.createVariableRenameContent(usage)
        : this.createDefinitionContent(usage, matchedContent)
      layerContents.push(content)
    }

    return layerContents
  }

  private canBeRenamed() {
    return false
  }

  private findDefinition(position: Position): Definition | undefined {
    return this.definitions.find((definition) => {
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

  private findMatchedContent(contents: Doc[] | null, definition: Definition | undefined) {
    return contents?.find(
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
