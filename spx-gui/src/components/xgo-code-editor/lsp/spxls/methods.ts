import type * as lsp from 'vscode-languageserver-protocol'
import { ResourceReferenceKind, parseDefinitionId, type DefinitionIdentifier } from '@/components/xgo-code-editor'

export type DocumentLinkForResourceReference = {
  range: lsp.Range
  target: string
  data: {
    kind: ResourceReferenceKind
  }
}

export function isDocumentLinkForResourceReference(link: lsp.DocumentLink): link is DocumentLinkForResourceReference {
  return link.target != null && Object.values(ResourceReferenceKind).includes(link.data?.kind)
}

export type DocumentLinkForDefinition = {
  range: lsp.Range
  /** Definition identifier string */
  target: string
}

export function parseDocumentLinkForDefinition(link: lsp.DocumentLink): DefinitionIdentifier | null {
  if (link.target == null) return null
  try {
    return parseDefinitionId(link.target)
  } catch {
    return null
  }
}

/** CompletionItemData represents data in a completion item. */
export type CompletionItemData = {
  /** The corresponding definition of the completion item */
  definition?: DefinitionIdentifier
}

export interface CompletionItem extends lsp.CompletionItem {
  data?: CompletionItemData
}
