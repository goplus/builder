import { mapValues } from 'lodash'
import * as lsp from 'vscode-languageserver-protocol'
import type { LocaleMessage } from '@/utils/i18n'
import type Emitter from '@/utils/emitter'
import type { Project } from '@/models/project'
import { ResourceModelIdentifier, type ResourceModel, type ResourceModelType } from '@/models/common/resource-model'
import { Sprite } from '@/models/sprite'
import { Sound } from '@/models/sound'
import { Backdrop } from '@/models/backdrop'
import { Costume } from '@/models/costume'
import { Animation } from '@/models/animation'
import { isWidget } from '@/models/widget'
import { stageCodeFilePaths } from '@/models/stage'

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

/**
 * URI of the resource. Examples:
 * - `spx://resources/sprites/<name>`
 * - `spx://resources/sounds/<name>`
 * - `spx://resources/sprites/<sName>/costumes/<cName>`
 */
export type ResourceURI = string

export function isResourceUri(uri: string): uri is ResourceURI {
  return uri.startsWith('spx://resources/')
}

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
  getWordAtPosition(position: Position): WordAtPosition | null
  getDefaultRange(position: Position): Range
  pushEdits(edits: TextEdit[]): void
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
  /**
   * If the definition should be hidden from the list. Typically a definition is hidden when:
   * - It is for internal usage only
   * - It is not recommended to use
   * - It is duplicated with another one
   */
  hiddenFromList?: true
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
  if (position.line === range.end.line && position.column > range.end.column) return false
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

export type ResourceType = ResourceModelType

export type ResourceNameWithType = {
  type: ResourceType
  name: string
}

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

export function getResourceModel(project: Project, resourceId: ResourceIdentifier): ResourceModel | null {
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

export function getResourceURI(resource: ResourceModel): string {
  if (resource instanceof Sprite) return `spx://resources/sprites/${encodeURIComponent(resource.name)}`
  if (resource instanceof Sound) return `spx://resources/sounds/${encodeURIComponent(resource.name)}`
  if (resource instanceof Backdrop) return `spx://resources/backdrops/${encodeURIComponent(resource.name)}`
  if (resource instanceof Costume) {
    const parent = resource.parent
    if (parent == null) throw new Error(`Costume ${resource.name} has no sprite`)
    if (!(parent instanceof Sprite)) throw new Error(`Invalid parent type: ${parent}`)
    return `spx://resources/sprites/${encodeURIComponent(parent.name)}/costumes/${encodeURIComponent(resource.name)}`
  }
  if (resource instanceof Animation) {
    const sprite = resource.sprite
    if (sprite == null) throw new Error(`Animation ${resource.name} has no sprite`)
    return `spx://resources/sprites/${encodeURIComponent(sprite.name)}/animations/${encodeURIComponent(resource.name)}`
  }
  if (isWidget(resource)) return `spx://resources/widgets/${encodeURIComponent(resource.name)}`
  throw new Error(`Unsupported resource type: ${resource}`)
}

export function getResourceIdentifier(resource: ResourceModel): ResourceIdentifier {
  return { uri: getResourceURI(resource) }
}

export function positionEq(a: Position | null, b: Position | null) {
  if (a == null || b == null) return a == b
  return a.line === b.line && a.column === b.column
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

export function textDocumentId2ResourceModelId(
  id: TextDocumentIdentifier,
  project: Project
): ResourceModelIdentifier | null {
  const codeFilePath = getCodeFilePath(id.uri)
  if (stageCodeFilePaths.includes(codeFilePath)) {
    return new ResourceModelIdentifier('stage')
  } else {
    for (const sprite of project.sprites) {
      if (sprite.codeFilePath === codeFilePath) {
        return new ResourceModelIdentifier('sprite', sprite.id)
      }
    }
  }
  return null
}

export function textDocumentIdEq(a: TextDocumentIdentifier | null, b: TextDocumentIdentifier | null) {
  if (a == null || b == null) return a === b
  return a.uri === b.uri
}

export function textDocumentId2CodeFileName(id: TextDocumentIdentifier) {
  const codeFilePath = getCodeFilePath(id.uri)
  if (stageCodeFilePaths.includes(codeFilePath)) {
    return { en: 'Stage', zh: '舞台' }
  } else {
    const spriteName = codeFilePath.replace(/\.spx$/, '')
    return { en: spriteName, zh: spriteName }
  }
}
