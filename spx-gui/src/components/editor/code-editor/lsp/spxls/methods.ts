import type * as lsp from 'vscode-languageserver-protocol'
import { isResourceUri, parseDefinitionId, type DefinitionIdentifier, type ResourceReferenceKind } from '../../common'

export type DocumentLinkForResourceReference = {
  range: lsp.Range
  /** Resource URI */
  target: string
  data: {
    kind: ResourceReferenceKind
  }
}

export function isDocumentLinkForResourceReference(link: lsp.DocumentLink): link is DocumentLinkForResourceReference {
  return link.target != null && isResourceUri(link.target)
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
