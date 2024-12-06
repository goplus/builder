import type { Range, Position, TextDocumentIdentifier } from '../../common'

export function makeCodeLinkWithPosition(textDocument: TextDocumentIdentifier, position: Position, content = '') {
  const positionStr = `${position.line},${position.column}`
  return `<code-link file="${textDocument.uri}" position="${positionStr}">${content}</code-link>`
}

export function makeCodeLinkWithRange(textDocument: TextDocumentIdentifier, range: Range, content = '') {
  const rangeStr = `${range.start.line},${range.start.column}-${range.end.line},${range.end.column}`
  return `<code-link file="${textDocument.uri}" range="${rangeStr}">${content}</code-link>`
}

export function makeCodeBlock(code: string, lang = 'spx') {
  return '```' + lang + '\n' + code + '\n```'
}
