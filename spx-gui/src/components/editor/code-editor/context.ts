import { watchEffect, type InjectionKey, inject, provide, type ShallowRef } from 'vue'
import { shikiToMonaco } from '@shikijs/monaco'
import { untilNotNull } from '@/utils/utils'
import { useI18n } from '@/utils/i18n'
import { getHighlighter } from '@/utils/spx/highlighter'
import { untilQueryLoaded, useQuery, type QueryRet } from '@/utils/query'
import type { Project } from '@/models/project'
import type { Runtime } from '@/models/runtime'
import { type Position, type ResourceIdentifier, type TextDocumentIdentifier } from './common'
import { type ICodeEditorUI } from './ui/code-editor-ui'
import { TextDocument } from './text-document'
import { getMonaco, type monaco, type Monaco } from './monaco'
import { CodeEditor } from './code-editor'

export type CodeEditorCtx = {
  attachUI(ui: ICodeEditorUI): void
  detachUI(ui: ICodeEditorUI): void
  getAttachedUI(): ICodeEditorUI | null
  getMonaco(): Monaco
  getTextDocument: (id: TextDocumentIdentifier) => TextDocument | null
  formatTextDocument(id: TextDocumentIdentifier): Promise<void>
  formatWorkspace(): Promise<void>
  /** Update code for renaming */
  rename(id: TextDocumentIdentifier, position: Position, newName: string): Promise<void>
  /** Update code for resource renaming, should be called before model name update */
  renameResource(resource: ResourceIdentifier, newName: string): Promise<void>
}

const codeEditorCtxInjectionKey: InjectionKey<CodeEditorCtx> = Symbol('code-editor-ctx')

export function useCodeEditorCtx() {
  const ctx = inject(codeEditorCtxInjectionKey)
  if (ctx == null) throw new Error('useCodeEditorCtx should be called inside of CodeEditor')
  return ctx
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
  projectRef: ShallowRef<Project | null>,
  runtimeRef: ShallowRef<Runtime | null>
): QueryRet<unknown> {
  const i18n = useI18n()

  const monacoQueryRet = useQuery<Monaco>(async () => {
    const [monaco, highlighter] = await Promise.all([getMonaco(i18n.lang.value), getHighlighter()])
    monaco.languages.register({ id: 'spx' })
    // TODO: this causes extra-padding issue when rendering selection
    shikiToMonaco(highlighter, monaco)
    monaco.languages.setLanguageConfiguration('spx', spxLanguageConfiguration)
    return monaco
  })

  const editorQueryRet = useQuery<CodeEditor>(
    async () => {
      const [project, runtime, monaco] = await Promise.all([
        untilNotNull(projectRef),
        untilNotNull(runtimeRef),
        untilQueryLoaded(monacoQueryRet)
      ])
      return new CodeEditor(project, runtime, monaco, i18n)
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
    rename(id: TextDocumentIdentifier, position: Position, newName: string) {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.rename(id, position, newName)
    },
    renameResource(resource: ResourceIdentifier, newName: string) {
      if (editorRef.value == null) throw new Error('Code editor not initialized')
      return editorRef.value.renameResource(resource, newName)
    }
  })

  return editorQueryRet
}
