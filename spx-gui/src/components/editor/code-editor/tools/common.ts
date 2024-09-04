import type { LocaleMessage } from '@/utils/i18n'

export enum ToolType {
  method,
  function,
  constant,
  keyword,
  variable
}

export enum ToolCallEffect {
  read,
  write,
  listen
}

export enum ToolContext {
  /** Availible only in sprite code files */
  sprite,
  /** Availible only in stage code files */
  stage,
  /** Availible in all code files */
  all
}

export type ToolUsage = {
  /** Description for usage, without tailing dot */
  desc: LocaleMessage
  /** Code sample, usually it's similar while sightly different with `insertText` */
  sample: string
  /**
   * A string or snippet that should be inserted in a document for the usage.
   * Same with `languages.CompletionItem.insertText`.
   */
  insertText: string
  /** Usage ID of Token */
  usageId?: string
}

export type Tool = {
  type: ToolType
  /**
   * The calling effect, only exists for function & method tool.
   * `undefined` means no effect.
   */
  callEffect?: ToolCallEffect
  target: ToolContext
  keyword: string
  /** Description, without tailing dot */
  desc: LocaleMessage
  usage?: Omit<ToolUsage, 'desc'>
  usages?: ToolUsage[]
  tokenId?: string
  tokenPkg?: string
}
