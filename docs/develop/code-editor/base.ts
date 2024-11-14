type TODO = any

type Position = {
  line: number
  column: number
}

type IRange = {
  start: Position
  end: Position
}

type ResourceIdentifier = {
  uri: string
}

type TextDocumentIdentifier = {
  uri: string
}

type TextDocumentPosition = {
  textDocument: TextDocumentIdentifier
  position: Position
}

type TextDocumentRange = {
  textDocument: TextDocumentIdentifier
  range: IRange
}

type CodeSegment = {
  range: IRange
  content: string
}

type Disposer = () => void

interface Emitter<T extends Record<string, any>> {
  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): Disposer
}

/** class `Project` from `models/project` */
declare class Project {}

enum DefinitionKind {
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
  Package,
}

interface DefinitionIdentifier {
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

type MarkdownString = {
  /** Markdown string with MDX support. */
  value: string
}

type Icon = string

/**
 * Documentation for an identifier, keyword, etc. Typically:
 * ```mdx
 * <Overview>func turn(dDirection float64)</Overview>
 * <Detail>
 *  Turn with given direction change.
 * </Detail>
 * ```
 */
type Documentation = MarkdownString

interface Action<I extends any[] = any, R = any> {
  title: string
  command: Command<I, R>
  arguments: I
}

interface BaseContext {
  /** Current active text document */
  textDocument: TextDocument
  /** Signal to abort long running operations */
  signal: AbortSignal
}

type Command<A extends any[], R> = string
type CommandHandler<A extends any[], R> = (...args: A) => Promise<R>
type CommandInfo<A extends any[], R> = {
  icon: Icon
  title: string
  handler: CommandHandler<A, R>
}

const builtInCommandCopilotChat: Command<[ChatTopic], void> = 'spx.copilot.chat'
const builtInCommandGoToDefinition: Command<[TextDocumentPosition], void> = 'spx.goToDefinition'
const builtInCommandRename: Command<[TextDocumentPosition], void> = 'spx.rename'
const builtInCommandResourceReferenceModify: Command<[TextDocumentRange, ResourceIdentifier], void> = 'spx.resourceReference.modify'

declare class EmitterImpl<T extends Record<string, any>> implements Emitter<T> {
  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): Disposer
  emit<K extends keyof T>(event: K, ...args: T[K]): void
}

declare const TODO: TODO
declare const ui: CodeEditorUI
declare const lsp: LSPClient
declare const project: Project
declare const runtime: Runtime
declare const documentBase: DocumentBase
declare const copilot: CopilotImpl
declare function isResourceURI(uri: string): boolean
declare function isApiDefinitionURI(uri: string): boolean
declare function contains(range: IRange, position: Position): boolean
declare function watch(target: TODO, listener: TODO): Disposer
declare function renameResourceModel(project: Project, resource: ResourceIdentifier, newName: string): Promise<void>
declare function applyWorkspaceEdit(project: Project, edit: WorkspaceEdit): Promise<void>
