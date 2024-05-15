import type { LocaleMessage } from '@/utils/i18n'

export enum SnippetType {
  method,
  function,
  constant,
  keyword,
  variable
}

export enum SnippetTarget {
  sprite,
  stage,
  all
}

export type Snippet = {
  type: SnippetType
  target: SnippetTarget
  label: string
  desc: LocaleMessage
  /**
   * A string or snippet that should be inserted in a document when selecting this completion.
   * Same with `languages.CompletionItem.insertText`.
   */
  insertText: string
}
