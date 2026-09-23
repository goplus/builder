import { getTextDocumentId, type TextDocumentRange } from '@/components/xgo-code-editor'

export function getSimpleExecutionLine(location: TextDocumentRange | null, codeFilePath: string | null): number | null {
  if (location == null || codeFilePath == null) return null
  if (location.textDocument.uri !== getTextDocumentId(codeFilePath).uri) return null
  return location.range.start.line
}
