import type {
  CodeSegment,
  DefinitionIdentifier,
  Diagnostic,
  Range,
  TextDocumentIdentifier,
  TextDocumentRange
} from '../common'

export enum CopilotExplainKind {
  CodeSegment,
  SymbolWithDefinition,
  Definition
}

export type CopilotExplainTargetCodeSegment = {
  kind: CopilotExplainKind.CodeSegment
  codeSegment: CodeSegment
}

export type SymbolWithDefinition = TextDocumentRange & {
  symbol: string
  definition: DefinitionIdentifier
}

export type CopilotExplainTargetSymbolWithDefinition = SymbolWithDefinition & {
  kind: CopilotExplainKind.SymbolWithDefinition
}

export type CopilotExplainTargetDefinition = {
  kind: CopilotExplainKind.Definition
  overview: string
  definition: DefinitionIdentifier
}

export type CopilotExplainTarget =
  | CopilotExplainTargetCodeSegment
  | CopilotExplainTargetSymbolWithDefinition
  | CopilotExplainTargetDefinition

export type CopilotReviewTarget = TextDocumentRange & {
  code: string
}

export type CopilotFixProblemTarget = {
  textDocument: TextDocumentIdentifier
  problem: Diagnostic
}

export function makeCodeLinkWithRange(textDocument: TextDocumentIdentifier, range: Range, content = '') {
  const rangeStr = `${range.start.line},${range.start.column}-${range.end.line},${range.end.column}`
  return `<code-link file="${textDocument.uri}" range="${rangeStr}">${content}</code-link>`
}

export function makeCodeBlock(code: string, lang = 'spx') {
  return '```' + lang + '\n' + code + '\n```'
}
