import type { editor } from 'monaco-editor'
import { Disposable } from '@/utils/disposable'
import type { Project } from '@/models/project'
import { Stage } from '@/models/stage'
import type { Sprite } from '@/models/sprite'
import {
  type Command,
  type CommandInfo,
  type IRange,
  type Position,
  type TextDocumentIdentifier,
  type ITextDocument
} from '../common'
import type { IHoverProvider } from './hover'
import type { ICompletionProvider } from './completion'
import type { IResourceReferencesProvider } from './resource-reference'
import type { IContextMenuProvider } from './context-menu'
import type { IDiagnosticsProvider } from './diagnostics'
import { APIReference, type IAPIReferenceProvider } from './api-reference'
import type { ICopilot } from './copilot'
import type { IFormattingEditProvider } from './formatting'

export * from './hover'
export * from './completion'
export * from './resource-reference'
export * from './context-menu'
export * from './diagnostics'
export * from './api-reference'
export * from './copilot'
export * from './formatting'

export { default as CodeEditorUIComp } from './CodeEditorUI.vue'

export interface ICodeEditorUI {
  registerHoverProvider(provider: IHoverProvider): void
  registerCompletionProvider(provider: ICompletionProvider): void
  registerResourceReferencesProvider(provider: IResourceReferencesProvider): void
  registerContextMenuProvider(provider: IContextMenuProvider): void
  registerDiagnosticsProvider(provider: IDiagnosticsProvider): void
  registerAPIReferenceProvider(provider: IAPIReferenceProvider): void
  registerCopilot(copilot: ICopilot): void
  registerFormattingEditProvider(provider: IFormattingEditProvider): void

  /** Execute a command */
  executeCommand<A extends any[], R>(command: Command<A, R>, ...input: A): Promise<R>
  /** Register a command with given name & handler */
  registerCommand<A extends any[], R>(command: Command<A, R>, info: CommandInfo<A, R>): void

  /** Open a text document in the editor. */
  open(textDocument: TextDocumentIdentifier): void
  /** Open a text document in the editor,and scroll to given position */
  open(textDocument: TextDocumentIdentifier, position: Position): void
  /** Open a text document in the editor, and select the given range */
  open(textDocument: TextDocumentIdentifier, range: IRange): void
}

class TextDocument implements ITextDocument {
  constructor(public id: TextDocumentIdentifier) {}

  getOffsetAt(position: Position): number {
    console.warn('TODO', position)
    return 0
  }

  getPositionAt(offset: number): Position {
    console.warn('TODO', offset)
    return { line: 0, column: 0 }
  }

  getValueInRange(range: IRange): string {
    console.warn('TODO', range)
    return ''
  }
}

export class CodeEditorUI extends Disposable implements ICodeEditorUI {
  registerHoverProvider(provider: IHoverProvider): void {
    console.warn('TODO', provider)
  }
  registerCompletionProvider(provider: ICompletionProvider): void {
    console.warn('TODO', provider)
  }
  registerResourceReferencesProvider(provider: IResourceReferencesProvider): void {
    console.warn('TODO', provider)
  }
  registerContextMenuProvider(provider: IContextMenuProvider): void {
    console.warn('TODO', provider)
  }
  registerDiagnosticsProvider(provider: IDiagnosticsProvider): void {
    console.warn('TODO', provider)
  }
  registerAPIReferenceProvider(provider: IAPIReferenceProvider): void {
    this.apiReference.registerProvider(provider)
  }
  registerCopilot(copilot: ICopilot): void {
    console.warn('TODO', copilot)
  }
  registerFormattingEditProvider(provider: IFormattingEditProvider): void {
    console.warn('TODO', provider)
  }

  async executeCommand<A extends any[], R>(command: Command<A, R>, ...input: A): Promise<R> {
    console.warn('TODO', command, input)
    return null as any
  }
  registerCommand<A extends any[], R>(command: Command<A, R>, info: CommandInfo<A, R>): void {
    console.warn('TODO', command, info)
  }

  open(textDocument: TextDocumentIdentifier): void
  open(textDocument: TextDocumentIdentifier, position: Position): void
  open(textDocument: TextDocumentIdentifier, range: IRange): void
  open(textDocument: TextDocumentIdentifier, positionOrRange?: Position | IRange): void {
    console.warn('TODO', textDocument, positionOrRange)
  }

  apiReference = new APIReference(this)

  constructor(private project: Project) {
    super()
  }

  monaco: typeof import('monaco-editor') | null = null

  initMonaco(monaco: typeof import('monaco-editor')) {
    // TODO: do monaco configuration here
    this.monaco = monaco
  }

  editor: editor.IStandaloneCodeEditor | null = null

  initEditor(editor: editor.IStandaloneCodeEditor) {
    // TODO: do editor configuration here
    this.editor = editor
  }

  activeTextDocument: ITextDocument | null = null

  init(signal: AbortSignal) {
    const { project, editor } = this
    if (editor == null) throw new Error('editor expected')

    let selected: Stage | Sprite
    if (project.selected?.type === 'stage') selected = project.stage
    else if (project.selected?.type === 'sprite') selected = project.selectedSprite!
    else return

    const actionName =
      selected instanceof Stage
        ? { en: 'Update stage code', zh: '修改舞台代码' }
        : { en: `Update ${selected.name} code`, zh: `修改 ${selected.name} 代码` }
    const action = { name: actionName, mergeable: true }

    // TODO: change of other code files
    editor.setValue(selected.code)
    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue()
      if (newValue === selected.code) return
      project.history.doAction(action, () => {
        selected.setCode(newValue)
      })
    })

    this.activeTextDocument = new TextDocument({ uri: 'TODO' })
    this.apiReference.init(signal)
  }

  dispose() {
    this.apiReference.dispose()
    super.dispose()
  }
}
