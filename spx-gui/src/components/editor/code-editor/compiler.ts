import type { Markdown } from "./EditorUI"

enum CodeEnum {
  Sprite,
  Backdrop
}

enum CompletionItemEnum {}

enum HintEnum {}

type Position = {}

type Range = {}

type Hint = {
  type: HintEnum
  content: string
  position: Position
}

type AttentionHint = {
  range: Range
  message: string
}

type CompletionItem = {
  type: CompletionItemEnum
  label: string
  insertText: string
}

export type TokenId = {
  // "github.com/goplus/spx"
  module: string
  // "Sprite.touching"
  name: string
}

type UsageId = string

type TokenUsage = {
  id: UsageId
  effect: string
  declaration: string
  sample: string
  insertText: string
}

export type UsageDoc = Markdown

export type TokenDoc = Array<{
  id: UsageId
  doc: UsageDoc
}>

export type Token = {
  id: TokenId
  usages: TokenUsage
}

type Code = {
  type: CodeEnum
  content: string
}

export class Compiler {
  getInlayHints(codes: Code[]): Hint[] {
    return []
  }
  getDiagnostics(codes: Code[]): AttentionHint[] {
    return []
  }
  getCompletionItems(codes: Code[], position: Position): CompletionItem[] {
    return []
  }
  getDefinition(codes: Code[], position: Position): Token | null {
    return null
  }
}
