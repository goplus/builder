enum CodeEnum {
  Sprite,
  Backdrop
}

export enum TokenEnum {
  // todo: remove me after compiler has done! this is temp using to make ts compile pass.
  ANY
}

enum TokenUsage {}

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

export type Token = {
  // "github.com/goplus/spx"
  module: string
  // "Sprite.touching"
  name: string
  type: TokenEnum
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
