import type * as monaco from 'monaco-editor'
import { Sprite } from '@/models/sprite'
import { stageCodeFilePaths, type Stage } from '@/models/stage'
import type { Action, Project } from '@/models/project'
import type { Range, Position, TextDocumentIdentifier, Selection } from '../common'

export type { monaco }
export type Monaco = typeof import('monaco-editor')
export type MonacoEditor = monaco.editor.IStandaloneCodeEditor
export { KeyCode as MonacoKeyCode } from 'monaco-editor'

declare module 'monaco-editor' {
  namespace editor {
    interface IStandaloneCodeEditor {
      // It is actually supported while not in the type definition
      onDidType: (callback: (text: string) => void) => monaco.IDisposable
    }
  }
}

export function token2Signal(token: monaco.CancellationToken): AbortSignal {
  const ctrl = new AbortController()
  if (token.isCancellationRequested) ctrl.abort()
  else token.onCancellationRequested((e) => ctrl.abort(e))
  return ctrl.signal
}

export function positionEq(a: Position | null, b: Position | null) {
  if (a == null || b == null) return a == b
  return a.line === b.line && a.column === b.column
}

export function fromMonacoPosition(position: monaco.IPosition): Position {
  return { line: position.lineNumber, column: position.column }
}

export function toMonacoPosition(position: Position): monaco.IPosition {
  return { lineNumber: position.line, column: position.column }
}

export function fromMonacoRange(range: monaco.IRange): Range {
  return {
    start: { line: range.startLineNumber, column: range.startColumn },
    end: { line: range.endLineNumber, column: range.endColumn }
  }
}

export function toMonacoRange(range: Range): monaco.IRange {
  return {
    startLineNumber: range.start.line,
    startColumn: range.start.column,
    endLineNumber: range.end.line,
    endColumn: range.end.column
  }
}

export function fromMonacoSelection(selection: monaco.ISelection): Selection {
  return {
    start: fromMonacoPosition({
      lineNumber: selection.selectionStartLineNumber,
      column: selection.selectionStartColumn
    }),
    position: fromMonacoPosition({
      lineNumber: selection.positionLineNumber,
      column: selection.positionColumn
    })
  }
}

export function toMonacoSelection(selection: Selection): monaco.ISelection {
  return {
    selectionStartLineNumber: selection.start.line,
    selectionStartColumn: selection.start.column,
    positionLineNumber: selection.position.line,
    positionColumn: selection.position.column
  }
}

export function getSelectionRange(selection: Selection): Range {
  return { start: selection.start, end: selection.position }
}

export function isRangeEmpty(range: Range) {
  return positionEq(range.start, range.end)
}

export function isSelectionEmpty(selection: Selection | null) {
  if (selection == null) return true
  return positionEq(selection.start, selection.position)
}

export function fromMonacoUri(uri: monaco.Uri): TextDocumentIdentifier {
  // TODO: check if this is correct
  return { uri: uri.toString() }
}

export function toMonacoUri(id: TextDocumentIdentifier, monaco: Monaco): monaco.Uri {
  return monaco.Uri.parse(id.uri)
}

const textDocumentURIPrefix = 'file:///'

export function getTextDocumentURI(codeFilePath: string) {
  return textDocumentURIPrefix + codeFilePath
}

export function getCodeFilePath(textDocumentURI: string) {
  if (!textDocumentURI.startsWith(textDocumentURIPrefix))
    throw new Error(`Invalid text document URI: ${textDocumentURI}`)
  return textDocumentURI.slice(textDocumentURIPrefix.length)
}

export interface ICodeOwner {
  getTextDocumentId(): TextDocumentIdentifier
  getCode(): string
  setCode(newCode: string): Promise<void>
}

class CodeOwnerStage implements ICodeOwner {
  action: Action
  constructor(
    private stage: Stage,
    private project: Project
  ) {
    this.action = {
      name: { en: 'Update stage code', zh: '修改舞台代码' },
      mergeable: true
    }
  }
  getTextDocumentId() {
    return { uri: getTextDocumentURI(this.stage.codeFilePath) }
  }
  getCode() {
    return this.stage.code
  }
  setCode(newCode: string) {
    return this.project.history.doAction(this.action, () => {
      this.stage.setCode(newCode)
    })
  }
}

class CodeOwnerSprite implements ICodeOwner {
  action: Action
  constructor(
    private sprite: Sprite,
    private project: Project
  ) {
    this.action = {
      name: { en: `Update ${sprite.name} code`, zh: `修改 ${sprite.name} 代码` },
      mergeable: true
    }
  }
  getTextDocumentId() {
    return { uri: getTextDocumentURI(this.sprite.codeFilePath) }
  }
  getCode() {
    return this.sprite.code
  }
  setCode(newCode: string) {
    return this.project.history.doAction(this.action, () => {
      this.sprite.setCode(newCode)
    })
  }
}

export function getSelectedCodeOwner(project: Project): ICodeOwner | null {
  const selected = project.selected
  if (selected == null) return null
  switch (selected.type) {
    case 'sprite':
      return new CodeOwnerSprite(project.selectedSprite!, project)
    case 'stage':
      return new CodeOwnerStage(project.stage, project)
    default:
      return null
  }
}

export function getCodeOwner(project: Project, textDocumentId: TextDocumentIdentifier): ICodeOwner | null {
  const codeFilePath = getCodeFilePath(textDocumentId.uri)
  if (stageCodeFilePaths.includes(codeFilePath)) {
    return new CodeOwnerStage(project.stage, project)
  }
  for (const sprite of project.sprites) {
    if (sprite.codeFilePath === codeFilePath) {
      return new CodeOwnerSprite(sprite, project)
    }
  }
  return null
}
