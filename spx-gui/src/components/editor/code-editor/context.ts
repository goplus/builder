import { watchEffect, type InjectionKey, inject, provide } from 'vue'
import { shikiToMonaco } from '@shikijs/monaco'
import { useI18n } from '@/utils/i18n'
import { getHighlighter } from '@/utils/spx/highlighter'
import { composeQuery, useQuery, type QueryRet } from '@/utils/query'
import type { Project } from '@/models/project'
import type { Runtime } from '@/models/runtime'
import {
  DiagnosticSeverity,
  type Position,
  type ResourceIdentifier,
  type TextDocumentIdentifier,
  type WorkspaceDiagnostics
} from './common'
import { type ICodeEditorUI } from './ui/code-editor-ui'
import { TextDocument } from './text-document'
import { getMonaco, type monaco, type Monaco } from './monaco'
import { CodeEditor } from './code-editor'
import type { ListFilter } from '@/models/list-filter'

export type CodeEditorCtx = {
  attachUI(ui: ICodeEditorUI): void
  detachUI(ui: ICodeEditorUI): void
  getAttachedUI(): ICodeEditorUI | null
  getMonaco(): Monaco
  getTextDocument: (id: TextDocumentIdentifier) => TextDocument | null
  formatTextDocument(id: TextDocumentIdentifier): Promise<void>
  formatWorkspace(): Promise<void>
  diagnosticWorkspace(): Promise<WorkspaceDiagnostics>
  /** Update code for (symbol) renaming */
  rename(id: TextDocumentIdentifier, position: Position, newName: string): Promise<void>
  /** Update code for resource renaming, should be called before model name update. */
  renameResource(resource: ResourceIdentifier, newName: string): Promise<void>

  listFilter: ListFilter
}

const codeEditorCtxInjectionKey: InjectionKey<CodeEditorCtx> = Symbol('code-editor-ctx')

export function useCodeEditorCtx() {
  const ctx = inject(codeEditorCtxInjectionKey)
  if (ctx == null) throw new Error('useCodeEditorCtx should be called inside of CodeEditor')
  return ctx
}

// There may be errors in the project code when renaming resource/symbol, which may cause some references to be updated incorrectly.
// This function is used to provide warning for errors in the project code when renaming: we notify the user to check the code and update the references manually.
export function useRenameWarning() {
  const codeEditorCtx = useCodeEditorCtx()
  return async function getRenameWarning() {
    const r = await codeEditorCtx.diagnosticWorkspace()
    const hasError = r.items.some((i) => i.diagnostics.some((d) => d.severity === DiagnosticSeverity.Error))
    if (!hasError) return null
    return {
      en: 'There are errors in the project code. Some references may not be updated automatically. You can check the code and update them manually after renaming.',
      zh: '当前项目代码中存在错误，部分引用可能不会自动更新，你可以在重命名后检查代码并手动修改。'
    }
  }
}

// copied from https://github.com/goplus/vscode-gop/blob/dc065c1701ec54a719747ff41d2054e9ed200eb8/languages/gop.language-configuration.json
const spxLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    {
      open: '{',
      close: '}'
    },
    {
      open: '[',
      close: ']'
    },
    {
      open: '(',
      close: ')'
    },
    {
      open: '`',
      close: '`',
      notIn: ['string']
    },
    {
      open: '"',
      close: '"',
      notIn: ['string']
    },
    {
      open: "'",
      close: "'",
      notIn: ['string', 'comment']
    }
  ],
  surroundingPairs: [
    {
      open: '{',
      close: '}'
    },
    {
      open: '[',
      close: ']'
    },
    {
      open: '(',
      close: ')'
    },
    {
      open: '"',
      close: '"'
    },
    {
      open: "'",
      close: "'"
    },
    {
      open: '`',
      close: '`'
    }
  ],
  indentationRules: {
    increaseIndentPattern: new RegExp(
      '^.*(\\bcase\\b.*:|\\bdefault\\b:|(\\b(func|if|else|switch|select|for|struct)\\b.*)?{[^}"\'`]*|\\([^)"\'`]*)$'
    ),
    decreaseIndentPattern: new RegExp('^\\s*(\\bcase\\b.*:|\\bdefault\\b:|}[)}]*[),]?|\\)[,]?)$')
  },
  folding: {
    markers: {
      start: new RegExp('^\\s*//\\s*#?region\\b'),
      end: new RegExp('^\\s*//\\s*#?endregion\\b')
    }
  }
}

export function useProvideCodeEditorCtx(
  projectRet: QueryRet<Project>,
  runtimeRet: QueryRet<Runtime>,
  listFilterRet: QueryRet<ListFilter>
): QueryRet<unknown> {
  const i18n = useI18n()

  const monacoQueryRet = useQuery<Monaco>(async () => {
    const [monaco, highlighter] = await Promise.all([getMonaco(i18n.lang.value), getHighlighter()])
    monaco.languages.register({ id: 'spx' })
    shikiToMonaco(highlighter, monaco)
    monaco.languages.setLanguageConfiguration('spx', spxLanguageConfiguration)
    return monaco
  })

  const editorQueryRet = useQuery<CodeEditor>(
    async (ctx) => {
      const [project, runtime, monaco, listFilter] = await Promise.all([
        composeQuery(ctx, projectRet),
        composeQuery(ctx, runtimeRet),
        composeQuery(ctx, monacoQueryRet),
        composeQuery(ctx, listFilterRet)
      ])
      ctx.signal.throwIfAborted()
      const codeEditor = new CodeEditor(project, runtime, monaco, i18n, listFilter)
      codeEditor.disposeOnSignal(ctx.signal)
      return codeEditor
    },
    { en: 'Failed to load code editor', zh: '加载代码编辑器失败' }
  )

  const editorRef = editorQueryRet.data
  const monacoRef = monacoQueryRet.data

  watchEffect((onCleanUp) => {
    const editor = editorRef.value
    if (editor == null) return
    editor.init()
    onCleanUp(() => editor.dispose())
  })

  provide(codeEditorCtxInjectionKey, {
    attachUI(ui: ICodeEditorUI) {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      editorRef.value.attachUI(ui)
    },
    detachUI(ui: ICodeEditorUI) {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      editorRef.value.detachUI(ui)
    },
    getAttachedUI() {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.getAttachedUI()
    },
    getMonaco() {
      if (monacoRef.value == null) throw new Error('Monaco not initialized')
      return monacoRef.value
    },
    getTextDocument(id: TextDocumentIdentifier) {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.getTextDocument(id)
    },
    formatTextDocument(id: TextDocumentIdentifier) {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.formatTextDocument(id)
    },
    formatWorkspace() {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.formatWorkspace()
    },
    diagnosticWorkspace() {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.diagnosticWorkspace()
    },
    rename(id: TextDocumentIdentifier, position: Position, newName: string) {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.rename(id, position, newName)
    },
    renameResource(resource: ResourceIdentifier, newName: string) {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.renameResource(resource, newName)
    },
    get listFilter() {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.filter
    }
  })

  return editorQueryRet
}
