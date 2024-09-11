import type { LocaleMessage } from '@/utils/i18n'
import type { Markdown } from '../EditorUI'

export type TokenId = {
  // "github.com/goplus/spx"
  module: string
  // "Sprite.touching"
  name: string
}

export type UsageId = string

export type TokenUsage = {
  id: UsageId
  effect: string
  declaration: string
  sample: string
  insertText: string
}

export type Token = {
  id: TokenId
  usages: TokenUsage[]
}

export type UsageDocumentContent = Markdown

export type TokenWithDoc = Token & {
  usages: UsageWithDoc[]
}

export type UsageWithDoc = {
  doc: UsageDocumentContent
} & TokenUsage

export type TokenGroup = {
  label: LocaleMessage
  tokens: Token[]
}

export type TokenCategory = {
  label: LocaleMessage
  groups: TokenGroup[]
}
