import type { Position } from '../../common'
import { InlayHintKind, type InlayHintItem } from '../../inlay-hint'
import type { monaco } from '../../monaco'

export type PresentedInlayHintItem = InlayHintItem & { retained?: boolean }

/** Keep only a previously resolved, single numeric argument through local deletions. */
export function retainDeletedParameter(
  confirmedSource: string,
  beforeSource: string,
  source: string,
  hints: InlayHintItem[],
  changes: readonly monaco.editor.IModelContentChange[],
  cursor: Position | null
): PresentedInlayHintItem | null {
  if (changes.length !== 1 || cursor == null) return null
  const change = changes[0]
  const { range } = change
  if (change.text !== '' || range.startLineNumber !== range.endLineNumber) return null
  const line = range.startLineNumber
  const candidates = hints.filter((hint) => hint.position.line === line)
  if (candidates.length !== 1) return null
  const hint = candidates[0]
  if (hint.kind !== InlayHintKind.Parameter || cursor.line !== line || cursor.column < hint.position.column) return null

  const confirmedLines = confirmedSource.split('\n')
  const beforeLines = beforeSource.split('\n')
  const lines = source.split('\n')
  if (confirmedLines.length !== lines.length || beforeLines.length !== lines.length) return null
  for (let i = 0; i < lines.length; i++) {
    if (i !== line - 1 && (lines[i] !== confirmedLines[i] || beforeLines[i] !== confirmedLines[i])) return null
  }
  const confirmedLine = confirmedLines[line - 1]
  const beforeLine = beforeLines[line - 1]
  const currentLine = lines[line - 1]
  if (confirmedLine == null || beforeLine == null || currentLine == null) return null
  const start = hint.position.column - 1
  const prefix = confirmedLine.slice(0, start)
  if (!/^[\t ]*[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*[\t ]+$/.test(prefix)) return null
  const argument = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)([\t \r]*)$/.exec(confirmedLine.slice(start))
  if (argument == null) return null
  const suffix = argument[2]
  if (!beforeLine.startsWith(prefix) || !beforeLine.endsWith(suffix)) return null
  const beforeArgument = beforeLine.slice(start, beforeLine.length - suffix.length)
  if (!/^[\deE+.-]*$/.test(beforeArgument)) return null
  if (
    range.startColumn < hint.position.column ||
    range.endColumn > hint.position.column + beforeArgument.length ||
    range.startColumn >= range.endColumn
  )
    return null
  const expected = beforeLine.slice(0, range.startColumn - 1) + beforeLine.slice(range.endColumn - 1)
  if (currentLine !== expected) return null
  return { ...hint, retained: true }
}
