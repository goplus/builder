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
  /** Function or method for causing effect, e.g., writing data */
  Effect,
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

/**
 * Model for text document
 * Similar to https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.ITextModel.html
 */
interface TextDocument {
  id: TextDocumentIdentifier
  getOffsetAt(position: Position): number
  getPositionAt(offset: number): Position
  getValueInRange(range: IRange): string
}

export type MarkdownString = {
  /** Markdown string with MDX support. */
  value: string
}

export type Icon = string

/**
 * Documentation for an identifier, keyword, etc. Typically:
 * ```mdx
 * <Overview>func turn(dDirection float64)</Overview>
 * <Detail>
 *  Turn with given direction change.
 * </Detail>
 * ```
 */
export type Documentation = MarkdownString

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
  textDocument: TextDocument
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
