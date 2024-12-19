import { mapValues } from 'lodash'
import * as lsp from 'vscode-languageserver-protocol'
import type { LocaleMessage } from '@/utils/i18n'
import type Emitter from '@/utils/emitter'
import type { Project } from '@/models/project'

export type Position = {
  line: number
  column: number
}

export type Range = {
  start: Position
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

export type ResourceIdentifier = {
  /**
   * URI of the resource. Examples:
   * - `spx://resources/sprites/<name>`
   * - `spx://resources/sounds/<name>`
   * - `spx://resources/sprites/<sName>/costumes/<cName>`
   */
  uri: string
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
  /** Overload Identifier. */
  overloadId?: string
}

/** gop:<package>?<name>#<overloadId> */
type DefinitionIdString = string

export function stringifyDefinitionId(defId: DefinitionIdentifier): DefinitionIdString {
  let idStr = 'gop:'
  if (defId.package != null) idStr += `${defId.package}`
  if (defId.name != null) idStr += `?${encodeURIComponent(defId.name)}`
  if (defId.overloadId != null) idStr += `#${encodeURIComponent(defId.overloadId)}`
  return idStr
}

export function parseDefinitionId(idStr: DefinitionIdString): DefinitionIdentifier {
  if (!idStr.startsWith('gop:')) throw new Error(`Invalid definition ID: ${idStr}`)
  idStr = idStr.slice(4)
  const [withoutHash, hash = ''] = idStr.split('#')
  const [hostWithPath, query = ''] = withoutHash.split('?')
  return {
    package: hostWithPath === '' ? undefined : hostWithPath,
    name: query === '' ? undefined : decodeURIComponent(query),
    overloadId: hash === '' ? undefined : decodeURIComponent(hash)
  }
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
  getWordAtPosition(position: Position): WordAtPosition | null
  getDefaultRange(position: Position): Range
}

export type MarkdownStringFlag = 'basic' | 'advanced'

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

export type CommandIconType = 'explain' | 'fix' | 'goto' | 'modify' | 'rename'

/**
 * Documentation string for a definition. Typically:
 * ```mdx
 * <OverviewWrapper>func turn(dDirection float64)</OverviewWrapper>
 * <Detail id="github.com/goplus/spx|Sprite.turn[0]" />
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
  game: 'game'
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
    others: 'others'
  },
  look: {
    visibility: 'visibility',
    behavior: 'behavior',
    costume: 'costume',
    animation: 'animation',
    backdrop: 'backdrop'
  },
  sensing: {
    distance: 'distance',
    mouse: 'mouse',
    keyboard: 'keyboard'
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
    others: 'others'
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
  /** Text to insert when completion / snippet is applied */
  insertText: string
  /** Brief explanation for the definition, typically the signature string */
  overview: string
  /** Detailed explanation for the definition, overview not included */
  detail: BasicMarkdownString
}

export interface IDocumentBase {
  getDocumentation(defId: DefinitionIdentifier): Promise<DefinitionDocumentationItem | null>
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

export function fromLSPRange(range: lsp.Range): Range {
  return {
    start: fromLSPPosition(range.start),
    end: fromLSPPosition(range.end)
  }
}

export function fromLSPSeverity(severity: lsp.DiagnosticSeverity): DiagnosticSeverity | null {
  switch (severity) {
    case lsp.DiagnosticSeverity.Error:
      return DiagnosticSeverity.Error
    case lsp.DiagnosticSeverity.Warning:
      return DiagnosticSeverity.Warning
    default:
      return null
  }
}

export function isResourceUri(uri: string): boolean {
  return uri.startsWith('spx://resources/')
}

/** Implemented by `Sprite`, `Sound` etc. */
export type IResourceModel = {
  /** Readable name and also unique identifier in list */
  name: string
}

export type ResourceType = 'sound' | 'sprite' | 'backdrop' | 'widget' | 'animation' | 'costume'
export type ResourceNameWithType = { name: string; type: ResourceType }

export function parseResourceURI(uri: string): ResourceNameWithType[] {
  if (!isResourceUri(uri)) throw new Error(`Invalid resource URI: ${uri}`)
  const url = new URL(uri)
  const parts = url.pathname.slice(1).split('/').map(decodeURIComponent)
  const parsed: ResourceNameWithType[] = []
  for (let i = 0; i < parts.length; ) {
    const type = (
      {
        sounds: 'sound',
        sprites: 'sprite',
        backdrops: 'backdrop',
        widgets: 'widget',
        animations: 'animation',
        costumes: 'costume'
      } as const
    )[parts[i]]
    const name = parts[i + 1]
    if (type == null || name == null) throw new Error(`Invalid resource uri: ${uri}`)
    parsed.push({ name, type })
    i += 2
  }
  return parsed
}

export function getResourceModel(project: Project, resourceId: ResourceIdentifier): IResourceModel | null {
  const parsed = parseResourceURI(resourceId.uri)
  switch (parsed[0].type) {
    case 'sound':
      return project.sounds.find((s) => s.name === parsed[0].name) ?? null
    case 'sprite': {
      const sprite = project.sprites.find((s) => s.name === parsed[0].name)
      if (sprite == null) return null
      if (parsed.length === 1) return sprite
      switch (parsed[1].type) {
        case 'animation':
          return sprite.animations.find((a) => a.name === parsed[1].name) ?? null
        case 'costume':
          return sprite.costumes.find((c) => c.name === parsed[1].name) ?? null
        default:
          throw new Error(`Invalid resource type: ${parsed[1].type}`)
      }
    }
    case 'backdrop':
      return project.stage.backdrops.find((b) => b.name === parsed[0].name) ?? null
    case 'widget':
      return project.stage.widgets.find((w) => w.name === parsed[0].name) ?? null
    default:
      throw new Error(`Invalid resource type: ${parsed[0].type}`)
  }
}

export function positionEq(a: Position | null, b: Position | null) {
  if (a == null || b == null) return a == b
  return a.line === b.line && a.column === b.column
}
