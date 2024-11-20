import type { LocaleMessage } from '@/utils/i18n'

export type Position = {
  line: number
  column: number
}

export type IRange = {
  start: Position
  end: Position
}

export type ResourceIdentifier = {
  uri: string
}

export type TextDocumentIdentifier = {
  uri: string
}

export type TextDocumentPosition = {
  textDocument: TextDocumentIdentifier
  position: Position
}

export type TextDocumentRange = {
  textDocument: TextDocumentIdentifier
  range: IRange
}

export type CodeSegment = {
  range: IRange
  content: string
}

export enum DefinitionKind {
  /** General function or method */
  Function,
  /** Function or method for reading data */
  Read,
  /** Function or method for executing commands, e.g., move a sprite */
  Command,
  /** Function or method for listening to event */
  Listen,
  /** Language defined statements, e.g., `for { ... }` */
  Statement,
  /** Variable or field definition */
  Variable,
  /** Constant definition */
  Constant,
  /** Package definition */
  Package
}

export type DefinitionIdentifier = {
  /**
   * Full name of source package.
   * If not provided, it's assumed to be kind-statement.
   * If `main`, it's the current user package.
   * Exmples:
   * - `fmt`
   * - `github.com/goplus/spx`
   * - `main`
   */
  package?: string
  /**
   * Exported name of the definition.
   * If not provided, it's assumed to be kind-package.
   * Examples:
   * - `Println`
   * - `Sprite`
   * - `Sprite.turn`
   * - `for_statement_with_single_condition`: kind-statement
   */
  name?: string
  /** Index in overloads. */
  overloadIndex?: number
}

export function stringifyDefinitionId(defId: DefinitionIdentifier): string {
  if (defId.name == null) {
    if (defId.package == null) throw new Error('package expected for ' + defId)
    return defId.package
  }
  const suffix = defId.overloadIndex == null ? '' : `[${defId.overloadIndex}]`
  if (defId.package == null) return defId.name + suffix
  return defId.package + '|' + defId.name + suffix
}

/**
 * Model for text document
 * Similar to https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.ITextModel.html
 */
export interface ITextDocument {
  id: TextDocumentIdentifier
  getOffsetAt(position: Position): number
  getPositionAt(offset: number): Position
  getValueInRange(range: IRange): string
}

export type MarkdownStringFlag = 'basic' | 'advanced'

/**
 * Markdown string with MDX support.
 * We use flag to distinguish different types of Markdown string.
 * Different types of Markdown string expect different rendering behaviors, especially for custom components support in MDX.
 */
export type MarkdownString<F extends MarkdownStringFlag> = {
  flag?: F
  /** Markdown string with MDX support. */
  value: string | LocaleMessage
}

/**
 * Markdown string with support of basic MDX components.
 * Typically, it is used in `DefinitionDocumentationItem.detail`.
 */
export type BasicMarkdownString = MarkdownString<'basic'>

export function makeBasicMarkdownString(value: string | LocaleMessage): BasicMarkdownString {
  return { value, flag: 'basic' }
}

/**
 * Markdown string with support of advanced MDX components, e.g., `OverviewWrapper`, `Detail` (which reads data from `DocumentBase` & render with `DetailWrapper`).
 * Typically, it is used in `CompletionItem.documentation` or `Hover.contents`.
 */
export type AdvancedMarkdownString = MarkdownString<'advanced'>

export type Icon = string

/**
 * Documentation string for a definition. Typically:
 * ```mdx
 * <OverviewWrapper>func turn(dDirection float64)</OverviewWrapper>
 * <Detail id="github.com/goplus/spx|Sprite.turn[0]" />
 * ```
 */
export type DefinitionDocumentationString = AdvancedMarkdownString

export const categoryEvent = 'event'
export const categoryEventGame = [categoryEvent, 'game']
export const categoryMotion = 'motion'
export const categoryMotionPosition = [categoryMotion, 'position']
export const categoryControl = 'control'
export const categoryControlFlow = [categoryControl, 'flow']

export type DefinitionDocumentationItem = {
  /** For classification when listed in a group, e.g., `[["event", "game"]]` */
  categories: string[][]
  kind: DefinitionKind
  definition: DefinitionIdentifier
  /** Text to insert when completion / snippet is applied */
  insertText: string
  /** Brief explanation for the definition, typically the signature string */
  overview: string
  /** Detailed explanation for the definition, overview not included */
  detail: BasicMarkdownString
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CommandConstraint<A, R> {}

export type Command<A extends any[], R> = string & CommandConstraint<A, R>
export type CommandHandler<A extends any[], R> = (...args: A) => Promise<R>
export type CommandInfo<A extends any[], R> = {
  icon: Icon
  title: string
  handler: CommandHandler<A, R>
}

export type Action<I extends any[] = any, R = any> = {
  title: string
  command: Command<I, R>
  arguments: I
}

export type BaseContext = {
  /** Current active text document */
  textDocument: ITextDocument
  /** Signal to abort long running operations */
  signal: AbortSignal
}

export type TextEdit = {
  range: Range
  newText: string
}

export type WorkspaceEdit = {
  changes?: { [uri: string]: TextEdit[] }
}

// const builtInCommandCopilotChat: Command<[ChatTopic], void> = 'spx.copilot.chat'
// const builtInCommandGoToDefinition: Command<[TextDocumentPosition], void> = 'spx.goToDefinition'
// const builtInCommandRename: Command<[TextDocumentPosition], void> = 'spx.rename'
// const builtInCommandResourceReferenceModify: Command<[TextDocumentRange, ResourceIdentifier], void> = 'spx.resourceReference.modify'
