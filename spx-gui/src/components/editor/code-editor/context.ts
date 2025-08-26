import { type InjectionKey, watch } from 'vue'
import { shikiToMonaco } from '@shikijs/monaco'
import { useI18n } from '@/utils/i18n'
import { ProgressCollector } from '@/utils/progress'
import { getHighlighter } from '@/utils/spx/highlighter'
import { composeQuery, useQuery, type QueryRet } from '@/utils/query'
import { useAppInject, useAppProvide } from '@/utils/app-state'
import type { Project } from '@/models/project'
import { ToolRegistry } from '@/components/agent-copilot/mcp/registry'
import type { EditorState } from '../editor-state'
import { DiagnosticSeverity } from './common'
import { getMonaco, type monaco, type Monaco } from './monaco'
import { CodeEditor } from './code-editor'

export type CodeEditorCtx = {
  getEditor(): CodeEditor | null
  mustEditor(): CodeEditor
  mustMonaco(): Monaco
}

const codeEditorCtxInjectionKey: InjectionKey<CodeEditorCtx> = Symbol('code-editor-ctx')

export function useCodeEditorCtxRef() {
  return useAppInject(codeEditorCtxInjectionKey)
}

export function useCodeEditorCtx() {
  const ctx = useAppInject(codeEditorCtxInjectionKey)
  if (ctx.value == null) throw new Error('useCodeEditorCtx should be called inside of CodeEditor')
  return ctx.value
}

// There may be errors in the project code when renaming resource/symbol, which may cause some references to be updated incorrectly.
// This function is used to provide warning for errors in the project code when renaming: we notify the user to check the code and update the references manually.
export function useRenameWarning() {
  const codeEditorCtx = useCodeEditorCtx()
  return async function getRenameWarning() {
    const r = await codeEditorCtx.mustEditor().diagnosticWorkspace()
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
    // Modified based on copied version to decrease indent for `else` & `else if`
    decreaseIndentPattern: new RegExp('^\\s*(\\bcase\\b.*:|\\bdefault\\b:|}[)}]*[),]?|}\\s*else\\b.*{|\\)[,]?)$')
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
  editorStateRet: QueryRet<EditorState>,
  registry: ToolRegistry
): QueryRet<unknown> {
  const i18n = useI18n()

  const monacoQueryRet = useQuery<Monaco>(async (ctx) => {
    const collector = ProgressCollector.collectorFor(ctx.reporter)
    const monacoReporter = collector.getSubReporter({ en: 'Loading Monaco...', zh: '正在加载 Monaco...' }, 2)
    const highlighterReporter = collector.getSubReporter(
      { en: 'Loading syntax highlighter...', zh: '正在加载语法高亮器...' },
      1
    )
    const [monaco, highlighter] = await Promise.all([
      getMonaco(i18n.lang.value).then((m) => (monacoReporter.report(1), m)),
      getHighlighter().then((h) => (highlighterReporter.report(1), h))
    ])
    monaco.languages.register({ id: 'spx' })
    shikiToMonaco(highlighter, monaco)
    monaco.languages.setLanguageConfiguration('spx', spxLanguageConfiguration)
    return monaco
  })

  const editorQueryRet = useQuery<CodeEditor>(
    async (ctx) => {
      const [project, editorState, monaco] = await Promise.all([
        composeQuery(ctx, projectRet, [null, 0]),
        composeQuery(ctx, editorStateRet, [null, 0]),
        composeQuery(ctx, monacoQueryRet)
      ])
      ctx.signal.throwIfAborted()
      const codeEditor = new CodeEditor(project, editorState.runtime, monaco, registry)
      codeEditor.disposeOnSignal(ctx.signal)
      return codeEditor
    },
    { en: 'Failed to load code editor', zh: '加载代码编辑器失败' }
  )

  const editorRef = editorQueryRet.data
  const monacoRef = monacoQueryRet.data

  watch(
    editorRef,
    (editor, _, onCleanUp) => {
      if (editor == null) return
      editor.init()
      onCleanUp(() => editor.dispose())
    },
    { immediate: true }
  )

  useAppProvide(codeEditorCtxInjectionKey, {
    getEditor() {
      return editorRef.value
    },
    mustEditor() {
      if (editorRef.value == null) throw new Error('CodeEditor is not initialized yet')
      return editorRef.value
    },
    mustMonaco() {
      if (monacoRef.value == null) throw new Error('Monaco is not initialized yet')
      return monacoRef.value
    }
  })

  return editorQueryRet
}
