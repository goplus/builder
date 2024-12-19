import type * as lsp from 'vscode-languageserver-protocol'
import { isResourceUri, type ResourceReferenceKind } from '../../common'

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
