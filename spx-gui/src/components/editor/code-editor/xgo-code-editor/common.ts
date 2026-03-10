import { mapValues } from 'lodash'
import * as lsp from 'vscode-languageserver-protocol'
import type { LocaleMessage } from '@/utils/i18n'
import type Emitter from '@/utils/emitter'

/**
 * Position stands for the position of a **character** in the document.
 * As LSP / Monaco position is "between two characters like an ‘insert’ cursor in an editor",
 * we use the "cursor" position before the character when converting between our Position and LSP / Monaco position.
 * See details in
 * - https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#position
 * - https://microsoft.github.io/monaco-editor/docs.html#interfaces/IPosition.html#column
 */
export type Position = {
  /** The line number, starting from `1` */
  line: number
  /** The column number, starting from `1` */
  column: number
}

export type Range = {
  /** The range's start position, inclusive */
  start: Position
  /** The range's end position, exclusive */
  end: Position
}

export type Selection = {
  start: Position
  position: Position
}

export enum ResourceReferenceKind {
  /** String literal as a resource-reference, e.g., `play "explosion"` */
  StringLiteral = 'stringLiteral',
  /** Auto-binding variable as a resource-reference, e.g., `var explosion Sound` */
  AutoBinding = 'autoBinding',
  /** Reference for auto-binding variable as a resource-reference, e.g., `play explosion` */
  AutoBindingReference = 'autoBindingReference',
  /** Reference for constant as a resource-reference, e.g., `play EXPLOSION` (`EXPLOSION` is a constant) */
  ConstantReference = 'constantReference'
}

/**
 * URI of the resource. Examples:
 * - `spx://resources/sprites/<name>`
 * - `spx://resources/sounds/<name>`
 * - `spx://resources/sprites/<sName>/costumes/<cName>`
 */
export type ResourceURI = string

/**
 * URI of the resource context. Examples:
 * - `spx://resources/sprites`
 * - `spx://resources/sounds`
 * - `spx://resources/sprites/<sName>/costumes`
 */
export type ResourceContextURI = string

export type ResourceIdentifier = {
  uri: ResourceURI
}

export type ResourceReference = {
  kind: ResourceReferenceKind
  range: Range
  resource: ResourceIdentifier
}

export type TextDocumentIdentifier = {
  /**
   * URI of the text document. Examples:
   * - `file:///main.spx`
   * - `file:///<spriteName>.spx`
   */
  uri: string
}

export type TextDocumentPosition = {
  textDocument: TextDocumentIdentifier
  position: Position
}

export type TextDocumentRange = {
  textDocument: TextDocumentIdentifier
  range: Range
}

export type CodeSegment = TextDocumentRange & {
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
  Package,
  /** Type definition */
  Type,
  /** Unknown definition kind */
  Unknown
}

export type DefinitionIdentifier = {
  /**
   * Full name of source package.
   * If not provided, it's assumed to be kind-statement.
   * If `main`, it's the current user package.
   * Exmples:
   * - `fmt`
   * - `github.com/goplus/spx/v2`
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
  /** Overload Identifier. */
  overloadId?: string
}

/** xgo:<package>?<name>#<overloadId> */
export type DefinitionIdString = string

export function stringifyDefinitionId(defId: DefinitionIdentifier): DefinitionIdString {
  let idStr = 'xgo:'
  if (defId.package != null) idStr += `${defId.package}`
  if (defId.name != null) idStr += `?${encodeURIComponent(defId.name)}`
  if (defId.overloadId != null) idStr += `#${encodeURIComponent(defId.overloadId)}`
  return idStr
}

export function parseDefinitionId(idStr: DefinitionIdString): DefinitionIdentifier {
  if (!idStr.startsWith('xgo:')) throw new Error(`Invalid definition ID: ${idStr}`)
  idStr = idStr.slice(4)
  const [withoutHash, hash = ''] = idStr.split('#')
  const [hostWithPath, query = ''] = withoutHash.split('?')
  return {
    package: hostWithPath === '' ? undefined : hostWithPath,
    name: query === '' ? undefined : decodeURIComponent(query),
    overloadId: hash === '' ? undefined : decodeURIComponent(hash)
  }
}

/**
 * Definition kinds that are considered as block content.
 * See details in https://github.com/goplus/builder/issues/1258.
 */
export const blockDefinitionKinds = [DefinitionKind.Command, DefinitionKind.Listen, DefinitionKind.Statement]

export function isBlockDefinitionKind(kind: DefinitionKind) {
  return blockDefinitionKinds.includes(kind)
}

export enum DiagnosticSeverity {
  Error = 'error',
  Warning = 'warning'
}

export type Diagnostic = {
  range: Range
  severity: DiagnosticSeverity
  message: string
}

export type TextDocumentDiagnostics = {
  textDocument: TextDocumentIdentifier
  diagnostics: Diagnostic[]
}

export type WorkspaceDiagnostics = {
  items: TextDocumentDiagnostics[]
}

export interface WordAtPosition {
  word: string
  startColumn: number
  endColumn: number
}

/**
 * Model for text document
 * Similar to https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.ITextModel.html
 */
export interface ITextDocument
  extends Emitter<{
    didChangeContent: string
  }> {
  id: TextDocumentIdentifier
  getValue(): string
  setValue(newValue: string): void
  getOffsetAt(position: Position): number
  getPositionAt(offset: number): Position
  getValueInRange(range: Range): string
  getLineContent(line: number): string
  getWordAtPosition(position: Position): WordAtPosition | null
  getDefaultRange(position: Position): Range
  getFullRange(): Range
  pushEdits(edits: TextEdit[]): void
}

export type MarkdownStringFlag = 'basic' | 'advanced' | 'mcp'

/**
 * Markdown string with MDX support.
 * We use flag to distinguish different types of Markdown string.
 * Different types of Markdown string expect different rendering behaviors, especially for custom components support in MDX.
 */
export type MarkdownString<F extends MarkdownStringFlag = MarkdownStringFlag> = {
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

export function makeAdvancedMarkdownString(value: string | LocaleMessage): AdvancedMarkdownString {
  return { value, flag: 'advanced' }
}

export type MCPMarkdownString = MarkdownString<'mcp'>

export function makeMCPMarkdownString(value: string | LocaleMessage): MCPMarkdownString {
  return { value, flag: 'mcp' }
}

export type CommandIconType = 'explain' | 'fix' | 'goto' | 'modify' | 'rename' | 'copy' | 'copilot'

/**
 * Documentation string for a definition. Typically:
 * ```mdx
 * <OverviewWrapper>func turn(dDirection float64)</OverviewWrapper>
 * <Detail id="github.com/goplus/spx/v2|Sprite.turn[0]" />
 * ```
 */
export type DefinitionDocumentationString = BasicMarkdownString | AdvancedMarkdownString

export type DefinitionDocumentationCategory = [main: string, sub: string]

export const mainCategories = {
  event: 'event',
  motion: 'motion',
  look: 'look',
  sensing: 'sensing',
  sound: 'sound',
  control: 'control',
  game: 'game',
  other: 'other'
}

export const subCategories = {
  event: {
    game: 'game',
    sensing: 'sensing',
    motion: 'motion',
    message: 'message',
    sprite: 'sprite',
    stage: 'stage'
  },
  motion: {
    position: 'position',
    heading: 'heading',
    size: 'size',
    rotationStyle: 'rotation-style',
    physics: 'physics',
    others: 'others'
  },
  look: {
    visibility: 'visibility',
    behavior: 'behavior',
    costume: 'costume',
    animation: 'animation',
    backdrop: 'backdrop',
    effect: 'effect'
  },
  sensing: {
    distance: 'distance',
    mouse: 'mouse',
    keyboard: 'keyboard',
    ask: 'ask'
  },
  sound: {
    playControl: 'play-control',
    volume: 'volume'
  },
  control: {
    time: 'time',
    flowControl: 'flow-control',
    declaration: 'declaration'
  },
  game: {
    startStop: 'start-stop',
    sprite: 'sprite',
    camera: 'camera',
    others: 'others'
  },
  other: {
    value: 'value',
    list: 'list'
  }
}

/**
 * Category definitions:
 * ```js
 * {
 *   event: {
 *     game: ['event', 'game'],
 *     ...
 *   },
 *   ...
 * }
 * ```
 */
export const categories = mapValues(subCategories, (subKeys, mainKey) => {
  const mainId = mainCategories[mainKey as keyof typeof subCategories]
  return mapValues(subKeys, (subId) => [mainId, subId] satisfies DefinitionDocumentationCategory)
}) as {
  [MC in keyof typeof subCategories]: {
    [SC in keyof (typeof subCategories)[MC]]: DefinitionDocumentationCategory
  }
}

export type DefinitionDocumentationItem = {
  /** For classification when listed in a group, e.g., `[["event", "game"]]` */
  categories: DefinitionDocumentationCategory[]
  kind: DefinitionKind
  definition: DefinitionIdentifier
  /** Snippet text to insert when completion / snippet is applied */
  insertSnippet: string
  /** Parameter hints for the inserted snippet, indexed by [TabStop / Placeholder](https://macromates.com/manual/en/snippets#tab_stops) in snippet */
  insertSnippetParameterHints?: string[]
  /** Brief explanation for the definition, typically the signature string */
  overview: string
  /** Detailed explanation for the definition, overview not included */
  detail: BasicMarkdownString
  /**
   * If the definition should be hidden from the list. Typically a definition is hidden when:
   * - It is for internal usage only
   * - It is not recommended to use
   * - It is duplicated with another one
   */
  hiddenFromList?: true
}

const ddiDragFormat = 'application/builder-definition-documentation-item'

/** Set DefinitionDocumentationItem in drag data */
export function setDdiDragData(dataTransfer: DataTransfer, item: DefinitionDocumentationItem): void {
  dataTransfer.setData('text/plain', item.overview)
  dataTransfer.setData(ddiDragFormat, JSON.stringify(item))
}

/** Get DefinitionDocumentationItem from drag data */
export function getDdiDragData(dataTransfer: DataTransfer): DefinitionDocumentationItem | null {
  const data = dataTransfer.getData(ddiDragFormat)
  if (data === '') return null
  return JSON.parse(data) as DefinitionDocumentationItem
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CommandConstraint<A, R> {}

export type Command<A extends any[], R> = string & CommandConstraint<A, R>
export type CommandHandler<A extends any[], R> = (...args: A) => R | Promise<R>
export type CommandInfo<A extends any[], R> = {
  icon: CommandIconType
  title: LocaleMessage
  handler: CommandHandler<A, R>
}
export type CommandArgs<C> = C extends Command<infer A, any> ? A : never

export type Action<A extends any[] = any, R = any> = {
  /** Title for the action. Command title will be used if not provided. */
  title?: string
  /** Command to be executed when action is triggered. */
  command: Command<A, R>
  /** Arguments passed to the command. */
  arguments: A
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

/** If p1 is after p2 */
export function positionAfter(p1: Position, p2: Position) {
  return p1.line > p2.line || (p1.line === p2.line && p1.column > p2.column)
}

export function isRangeEmpty(range: Range) {
  return positionEq(range.start, range.end)
}

export function isSelectionEmpty(selection: Selection | null) {
  if (selection == null) return true
  return positionEq(selection.start, selection.position)
}

export function containsPosition(range: Range, position: Position) {
  if (position.line < range.start.line || position.line > range.end.line) return false
  if (position.line === range.start.line && position.column < range.start.column) return false
  if (position.line === range.end.line && position.column >= range.end.column) return false
  return true
}

export function selection2Range(selection: Selection): Range {
  const reversed = positionAfter(selection.start, selection.position)
  return {
    start: reversed ? selection.position : selection.start,
    end: reversed ? selection.start : selection.position
  }
}

export function toLSPPosition(pos: Position): lsp.Position {
  return {
    line: pos.line - 1,
    character: pos.column - 1
  }
}

export function fromLSPPosition(pos: lsp.Position): Position {
  return {
    line: pos.line + 1,
    column: pos.character + 1
  }
}

export function toLSPRange(range: Range): lsp.Range {
  return {
    start: toLSPPosition(range.start),
    end: toLSPPosition(range.end)
  }
}

export function fromLSPRange(range: lsp.Range): Range {
  return {
    start: fromLSPPosition(range.start),
    end: fromLSPPosition(range.end)
  }
}

export function fromLSPSeverity(severity: lsp.DiagnosticSeverity | undefined): DiagnosticSeverity {
  switch (severity) {
    case lsp.DiagnosticSeverity.Error:
      return DiagnosticSeverity.Error
    case lsp.DiagnosticSeverity.Warning:
      return DiagnosticSeverity.Warning
    default:
      return DiagnosticSeverity.Error
  }
}

export function fromLSPDiagnostic(diagnostic: lsp.Diagnostic): Diagnostic {
  return {
    range: fromLSPRange(diagnostic.range),
    severity: fromLSPSeverity(diagnostic.severity),
    message: diagnostic.message
  }
}

export function fromLSPTextEdit(edit: lsp.TextEdit): TextEdit {
  return {
    range: fromLSPRange(edit.range),
    newText: edit.newText
  }
}

export enum InputSlotKind {
  /**
   * The slot accepts value, which may be a in-place value or a predefined identifier.
   * For example: `123` in `println 123`
   */
  Value = 'value',
  /**
   * The slot accepts address, which must be a predefined identifier.
   * For example: `x` in `x = 123`
   */
  Address = 'address'
}

export enum InputKind {
  /**
   * In-place value
   * For example: `"hello world"`, `123`, `true`, spx `Left`, spx `RGB(0,0,0)`
   */
  InPlace = 'in-place',
  /**
   * (Reference to) user predefined identifier
   * For example: var `costume1`, const `name2`, field `num3`
   */
  Predefined = 'predefined'
}

export type InputType = string

export enum BuiltInInputType {
  /** Integer */
  Integer = 'integer',
  /** Decimal */
  Decimal = 'decimal',
  /** String */
  String = 'string',
  /** Boolean */
  Boolean = 'boolean',
  /** Resource name (`SpriteName`, `SoundName`, etc.) */
  // TODO: Rename to `resource-name` or `xgo-resource-name` — the resource mechanism is spx-agnostic
  ResourceName = 'spx-resource-name',
  /** Unknown type */
  Unknown = 'unknown'
}

export type InputTypedValue = {
  type: InputType
  value: unknown
}

type BuiltInInputTypedValue =
  | { type: BuiltInInputType.Integer; value: number }
  | { type: BuiltInInputType.Decimal; value: number }
  | { type: BuiltInInputType.String; value: string }
  | { type: BuiltInInputType.Boolean; value: boolean }
  | { type: BuiltInInputType.ResourceName; value: ResourceURI }
  | { type: BuiltInInputType.Unknown; value: void }

export type InputValueForType<T> = (BuiltInInputTypedValue & { type: T })['value']

export type InPlaceInput = {
  kind: InputKind.InPlace
  type: InputType
  value: unknown
}

export type PredefinedInput = {
  kind: InputKind.Predefined
  type: InputType
  /** Name for user predefined identifer */
  name: string
}

export type Input = InPlaceInput | PredefinedInput

export type InputSlotAccept = {
  /** Input type accepted by the slot */
  type: InputType
  [key: string]: unknown
}

export type InputSlotAcceptForType<T> = T extends BuiltInInputType.ResourceName
  ? InputSlotAccept & {
      /** Resource context */
      resourceContext: ResourceContextURI
    }
  : InputSlotAccept

export type InputSlot = {
  /** Kind of the slot */
  kind: InputSlotKind
  /** Info describing what inputs are accepted by the slot */
  accept: InputSlotAccept
  /** Current input in the slot */
  input: Input
  /** Names for user predefined identifiers available for the slot */
  predefinedNames: string[]
  /** Range in code for the slot */
  range: Range
}

export function positionEq(a: Position | null, b: Position | null) {
  if (a == null || b == null) return a == b
  return a.line === b.line && a.column === b.column
}

export function rangeEq(a: Range | null, b: Range | null) {
  if (a == null || b == null) return a == b
  return positionEq(a.start, b.start) && positionEq(a.end, b.end)
}

export function rangeContains(a: Range, b: Range) {
  return (
    (positionEq(a.start, b.start) || positionAfter(b.start, a.start)) &&
    (positionEq(a.end, b.end) || positionAfter(a.end, b.end))
  )
}

const textDocumentURIPrefix = 'file:///'

export function getTextDocumentId(codeFilePath: string) {
  return { uri: textDocumentURIPrefix + codeFilePath }
}

export function getCodeFilePath(textDocumentURI: string) {
  if (!textDocumentURI.startsWith(textDocumentURIPrefix))
    throw new Error(`Invalid text document URI: ${textDocumentURI}`)
  return textDocumentURI.slice(textDocumentURIPrefix.length)
}

export function textDocumentIdEq(a: TextDocumentIdentifier | null, b: TextDocumentIdentifier | null) {
  if (a == null || b == null) return a === b
  return a.uri === b.uri
}
