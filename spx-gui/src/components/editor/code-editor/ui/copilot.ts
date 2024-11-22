import {
  type BaseContext,
  type IRange,
  type DefinitionIdentifier,
  type CodeSegment,
  type TextDocumentRange,
  type MarkdownString
} from '../common'
import type { Diagnostic } from './diagnostics'

export enum ChatTopicKind {
  Inspire,
  Explain,
  Review,
  FixProblem
}

export type ChatTopicInspire = {
  kind: ChatTopicKind.Inspire
  question: string
}

export enum ChatExplainKind {
  CodeSegment,
  SymbolWithDefinition
}

export type ChatExplainTargetCodeSegment = {
  kind: ChatExplainKind.CodeSegment
  codeSegment: CodeSegment
}

export type SymbolWithDefinition = {
  range: TextDocumentRange
  definition: DefinitionIdentifier
}

export type ChatExplainTargetSymbolWithDefinition = SymbolWithDefinition & {
  kind: ChatExplainKind.SymbolWithDefinition
}

export type ChatTopicExplain = {
  kind: ChatTopicKind.Explain
  target: ChatExplainTargetCodeSegment | ChatExplainTargetSymbolWithDefinition
}

export type ChatTopicReview = {
  kind: ChatTopicKind.Review
  codeRange: IRange
}

export type ChatTopicFixProblem = {
  kind: ChatTopicKind.FixProblem
  problem: Diagnostic
}

export type ChatTopic = ChatTopicInspire | ChatTopicExplain | ChatTopicReview | ChatTopicFixProblem

export enum MessageRole {
  User,
  Copilot
}

export type ChatMessage = {
  role: MessageRole
  content: MarkdownString
}

export type Chat = {
  topic: ChatTopic
  messages: ChatMessage[]
}

export type ChatContext = BaseContext

export interface ICopilot {
  getChatCompletion(ctx: ChatContext, chat: Chat): Promise<ChatMessage | null>
}
