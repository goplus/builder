import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { keywords, typeKeywords } from '@/utils/spx'
import type { I18n } from '@/utils/i18n'
import type { FormatResponse } from '@/apis/util'
import formatWasm from '@/assets/format.wasm?url'
import { getAllTools, ToolType } from './tools'
import { useUIVariables } from '@/components/ui'
import type { IDisposable, IRange, languages, Position } from 'monaco-editor'
import type { Project } from '@/models/project'
import { injectMonacoHighlightTheme } from '@/components/editor/code-editor/ui/common/languages'
import {
  type CompletionItem,
  EditorUI,
  type TextModel
} from '@/components/editor/code-editor/EditorUI'
import { Icon2CompletionItemKind } from '@/components/editor/code-editor/ui/features/completion-menu/completion-menu'

declare global {
  /** Notice: this is available only after `initFormatWasm()` */
  function formatSPX(input: string): FormatResponse
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function initFormatWasm() {
  const go = new Go()
  const result = await WebAssembly.instantiateStreaming(fetch(formatWasm), go.importObject)
  go.run(result.instance)
}

const monacoProviderDisposes: Record<string, IDisposable | null> = {
  completionProvider: null,
  hoverProvider: null
}
/** Global initializations for monaco editor */
export async function initMonaco(
  monaco: typeof import('monaco-editor'),
  { color }: ReturnType<typeof useUIVariables>,
  i18n: I18n,
  getProject: () => Project,
  ui: EditorUI
) {
  self.MonacoEnvironment = {
    getWorker() {
      return new EditorWorker()
    }
  }

  const LANGUAGE_NAME = 'spx'

  monaco.languages.register({
    id: LANGUAGE_NAME
  })

  // keep this for auto match brackets when typing
  monaco.languages.setLanguageConfiguration(LANGUAGE_NAME, {
    // tokenize all words as identifiers
    wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['"', '"'],
      ["'", "'"]
    ]
  })

  monacoProviderDisposes.completionProvider = monaco.languages.registerCompletionItemProvider(
    LANGUAGE_NAME,
    {
      provideCompletionItems: (model, position, _, cancelToken) => {
        // when AST and AI are ready, this line and reload functions will be removed.
        const suggestions = getPreDefinedCompletionItem(model, position, monaco, i18n, getProject)

        // get current position id to determine if need to request completion provider resolve
        const word = model.getWordUntilPosition(position)
        const project = getProject()
        const fileHash = project.currentFilesHash || ''
        const CompletionItemCacheID = {
          id: fileHash,
          lineNumber: position.lineNumber,
          column: word.startColumn
        }

        // is position changed, inner cache will clean `cached data`
        // in a word, if position changed will call `requestCompletionProviderResolve`
        const isNeedRequestCompletionProviderResolve =
          !ui.completionMenu?.completionItemCache.isCacheAvailable(CompletionItemCacheID)

        if (isNeedRequestCompletionProviderResolve) {
          const abortController = new AbortController()
          cancelToken.onCancellationRequested(() => abortController.abort())
          ui.requestCompletionProviderResolve(
            model,
            {
              position,
              unitWord: word.word,
              signal: abortController.signal
            },
            (items: CompletionItem[]) => {
              ui.completionMenu?.completionItemCache.add(CompletionItemCacheID, items)
              // if you need user immediately show updated completion items, we need close it and reopen it.
              ui.completionMenu?.editor.trigger('editor', 'hideSuggestWidget', {})
              ui.completionMenu?.editor.trigger('keyboard', 'editor.action.triggerSuggest', {})
            }
          )
          return { suggestions }
        } else {
          const cachedSuggestions =
            ui.completionMenu?.completionItemCache.getAll(CompletionItemCacheID).map(
              (item): languages.CompletionItem => ({
                label: item.label,
                kind: Icon2CompletionItemKind(item.icon),
                insertText: item.insertText,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: word.startColumn,
                  endColumn: word.endColumn
                }
              })
            ) || []
          return { suggestions: [...suggestions, ...cachedSuggestions] }
        }
      }
    }
  )

  monacoProviderDisposes.hoverProvider = monaco.languages.registerHoverProvider(LANGUAGE_NAME, {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position)
      if (word == null) return
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }
      const tools = getAllTools(getProject())
      const tool = tools.find((s) => s.keyword === word.word)
      if (tool == null) return
      let text = i18n.t(tool.desc) + i18n.t({ en: ', e.g.', zh: '，示例：' })
      if (tool.usage != null) {
        text += ` 
\`\`\`gop
${tool.usage.sample}
\`\`\``
      } else {
        text = [
          text,
          ...tool.usages!.map((usage) => {
            const colon = i18n.t({ en: ': ', zh: '：' })
            const desc = i18n.t(usage.desc)
            return `* ${desc}${colon}
\`\`\`gop
${usage.sample}
\`\`\``
          })
        ].join('\n')
      }
      return {
        range,
        contents: [{ value: text }]
      }
    }
  })

  await injectMonacoHighlightTheme(monaco)

  // temporarily disable in-browser format
  // initFormat()
}

/**
 * providers need to be disposed before the editor is destroyed.
 * otherwise, in current file will cause duplicate completion items when HMR is triggered in development mode.
 */
export function disposeMonacoProviders() {
  if (monacoProviderDisposes.completionProvider) {
    monacoProviderDisposes.completionProvider.dispose()
    monacoProviderDisposes.completionProvider = null
  }
  if (monacoProviderDisposes.hoverProvider) {
    monacoProviderDisposes.hoverProvider.dispose()
    monacoProviderDisposes.hoverProvider = null
  }
}

function getPreDefinedCompletionItem(
  model: TextModel,
  position: Position,
  monaco: typeof import('monaco-editor'),
  i18n: I18n,
  getProject: () => Project
) {
  const word = model.getWordUntilPosition(position)
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn
  }
  return getCompletionItems(range, monaco, i18n, getProject())
}

function getCompletionItems(
  range: IRange | languages.CompletionItemRanges,
  monaco: typeof import('monaco-editor'),
  i18n: I18n,
  project: Project
): languages.CompletionItem[] {
  const items: languages.CompletionItem[] = [
    ...keywords.map((keyword) => ({
      label: keyword,
      insertText: keyword,
      kind: monaco.languages.CompletionItemKind.Keyword,
      range
    })),
    ...typeKeywords.map((typeKeyword) => ({
      label: typeKeyword,
      insertText: typeKeyword,
      kind: monaco.languages.CompletionItemKind.TypeParameter,
      range
    }))
  ]
  for (const tool of getAllTools(project)) {
    const basics = {
      label: tool.keyword,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      kind: getCompletionItemKind(tool.type, monaco),
      range
    }
    if (tool.usage != null) {
      items.push({
        ...basics,
        insertText: tool.usage.insertText,
        detail: i18n.t(tool.desc)
      })
      continue
    }
    for (const usage of tool.usages!) {
      items.push({
        ...basics,
        insertText: usage.insertText,
        detail: [i18n.t(tool.desc), i18n.t(usage.desc)].join(' - ')
      })
    }
  }
  return items
}

function getCompletionItemKind(type: ToolType, monaco: typeof import('monaco-editor')) {
  switch (type) {
    case ToolType.method:
      return monaco.languages.CompletionItemKind.Function
    case ToolType.function:
      return monaco.languages.CompletionItemKind.Function
    case ToolType.constant:
      return monaco.languages.CompletionItemKind.Constant
    case ToolType.keyword:
      return monaco.languages.CompletionItemKind.Snippet
    case ToolType.variable:
      return monaco.languages.CompletionItemKind.Variable
  }
}
