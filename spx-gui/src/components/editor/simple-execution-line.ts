import { getTextDocumentId } from '@/components/xgo-code-editor'
import type { RuntimeLocation } from './runtime'

export function getSimpleExecutionLine(location: RuntimeLocation | null, codeFilePath: string | null): number | null {
  if (location == null || codeFilePath == null) return null
  if (location.textDocument.uri !== getTextDocumentId(codeFilePath).uri) return null
  return location.line
}
