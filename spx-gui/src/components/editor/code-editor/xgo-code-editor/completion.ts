/**
 * @desc ICompletionProvider interface + CompletionProvider default implementation.
 * Uses ILSPClient + DocumentBase + pkgPaths. No spx-specific knowledge.
 */

import * as lsp from 'vscode-languageserver-protocol'
import type { BaseContext, DefinitionDocumentationString, Position } from './common'
import { DefinitionKind, makeAdvancedMarkdownString, toLSPPosition } from './common'
import type { ILSPClient } from './lsp/types'
import type { IDocumentBase } from './document-base'
import type { ClassFramework } from './project'

export { DefinitionKind as CompletionItemKind }

export enum InsertTextFormat {
  PlainText,
  Snippet
}

export type CompletionItem = {
  label: string
  kind: DefinitionKind
  insertText: string
  insertTextFormat: InsertTextFormat
  documentation: DefinitionDocumentationString | null
}

export type CompletionContext = BaseContext

export interface ICompletionProvider {
  provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]>
}

export class CompletionProvider implements ICompletionProvider {
  constructor(
    private lspClient: ILSPClient,
    private documentBase: IDocumentBase,
    private classFramework: ClassFramework
  ) {}

  private getCompletionItemKind(kind: lsp.CompletionItemKind | undefined): DefinitionKind {
    switch (kind) {
      case lsp.CompletionItemKind.Method:
      case lsp.CompletionItemKind.Function:
      case lsp.CompletionItemKind.Constructor:
        return DefinitionKind.Function
      case lsp.CompletionItemKind.Field:
      case lsp.CompletionItemKind.Variable:
      case lsp.CompletionItemKind.Property:
        return DefinitionKind.Variable
      case lsp.CompletionItemKind.Interface:
      case lsp.CompletionItemKind.Enum:
      case lsp.CompletionItemKind.Struct:
      case lsp.CompletionItemKind.TypeParameter:
        return DefinitionKind.Type
      case lsp.CompletionItemKind.Module:
        return DefinitionKind.Package
      case lsp.CompletionItemKind.Keyword:
      case lsp.CompletionItemKind.Operator:
        return DefinitionKind.Statement
      case lsp.CompletionItemKind.EnumMember:
      case lsp.CompletionItemKind.Text:
      case lsp.CompletionItemKind.Constant:
        return DefinitionKind.Constant
      default:
        return DefinitionKind.Unknown
    }
  }

  private getInsertTextFormat(insertTextFormat: lsp.InsertTextFormat | undefined): InsertTextFormat {
    switch (insertTextFormat) {
      case lsp.InsertTextFormat.Snippet:
        return InsertTextFormat.Snippet
      default:
        return InsertTextFormat.PlainText
    }
  }

  async provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]> {
    const items = await this.lspClient.getCompletionItems(
      { signal: ctx.signal },
      {
        textDocument: ctx.textDocument.id,
        position: toLSPPosition(position)
      }
    )
    const lineContent = ctx.textDocument.getLineContent(position.line)
    const isLineEnd = lineContent.length === position.column - 1
    const maybeItems = await Promise.all(
      items.map(async (item) => {
        const result: CompletionItem = {
          label: item.label,
          kind: this.getCompletionItemKind(item.kind),
          insertText: item.label,
          insertTextFormat: InsertTextFormat.PlainText,
          documentation: null
        }

        if (item.insertText != null) {
          result.insertText = item.insertText
          result.insertTextFormat = this.getInsertTextFormat(item.insertTextFormat)
        }

        const defId = item.data?.definition
        const definition = defId != null ? await this.documentBase.getDocumentation(defId) : null

        // Skip APIs from framework packages without documentation — assumed not recommended
        const classFrameworkPkg = this.classFramework.pkgPaths[0]
        if (defId != null && defId.package === classFrameworkPkg && definition == null) return null
        if (definition != null && definition.hiddenFromList) return null

        if (definition != null) {
          result.kind = definition.kind
          result.documentation = definition.detail
          // Typically:
          // * The insertSnippet in definition stands for whole expression of the API
          // * The insertText from LS stands for identifier of the API
          // We use the insertSnippet to replace the insertText if the two conditions are both met:
          // 1. The inputting happens at the end of the line.
          //   If in the middle of the line, snippet may mess up the code
          // 2. The insertSnippet starts with the insertText.
          //   If not, that may be senarios like `Camera.zoom` (insertSnippet) vs `zoom` (insertText)
          if (isLineEnd && definition.insertSnippet.startsWith(result.insertText)) {
            result.insertText = definition.insertSnippet
            result.insertTextFormat = InsertTextFormat.Snippet
          }
        }

        if (item.documentation != null) {
          const docStr = lsp.MarkupContent.is(item.documentation) ? item.documentation.value : item.documentation
          result.documentation = makeAdvancedMarkdownString(docStr)
        }

        return result
      })
    )
    return maybeItems.filter((item) => item != null) as CompletionItem[]
  }
}
