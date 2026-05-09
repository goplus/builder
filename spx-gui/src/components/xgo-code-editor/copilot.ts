import type { LocaleMessage } from '@/utils/i18n'
import type {
  CodeSegment,
  DefinitionIdentifier,
  Diagnostic,
  Range,
  TextDocumentIdentifier,
  TextDocumentRange
} from './common'

/**
 * Minimal topic shape required by code-editor initiated Copilot requests.
 * This intentionally mirrors the corresponding fields of the Copilot module's `Topic` type without importing it.
 */
export type CopilotTopic = {
  title: LocaleMessage
  description: string
  reactToEvents: boolean
}

/**
 * Capability contract defined by xgo-code-editor for optional Copilot integration.
 * The Copilot module's `Copilot` class structurally satisfies this interface, but the editor does not depend on that module.
 */
export interface ICopilot {
  addUserTextMessage(content: string, topic: CopilotTopic): void
}

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

export function makeCodeBlock(code: string, lang = 'xgo') {
  return '```' + lang + '\n' + code + '\n```'
}
