import type { LocaleMessage } from '@/utils/i18n'

enum CodeEnum {
  Sprite,
  Backdrop
}

type TokenUsage = {
  // when don't hava markdown, here show declaration signature
  desc: LocaleMessage
  insertText: string
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

export type Token = {
  id: TokenId
  usages: TokenUsage[]
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
