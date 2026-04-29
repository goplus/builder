import { shikiToMonaco } from '@shikijs/monaco'
import type * as monaco from 'monaco-editor'
import { getHighlighter } from '@/utils/xgo/highlighter'

export type { monaco }
export type Monaco = typeof monaco
export type MonacoEditor = monaco.editor.IStandaloneCodeEditor

declare module 'monaco-editor' {
  namespace editor {
    interface IStandaloneCodeEditor {
      // It is actually supported while not in the type definition
      onDidType: (callback: (text: string) => void) => monaco.IDisposable
    }
  }
}

export type Lang = 'en' | 'zh'

window.MonacoEnvironment = {
  async getWorker() {
    const { default: EditorWorker } = await import('monaco-editor/esm/vs/editor/editor.worker?worker')
    return new EditorWorker()
  }
}

async function getMonaco(lang: Lang) {
  // Now there's no official solution for localization of ESM version Monaco,
  // see details in https://github.com/microsoft/monaco-editor/issues/1514.
  // While it is no big deal as now most UIs (with text) in code-editor are implemented by ourselves in Builder.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  lang // TODO: Do localization for monaco
  return import('monaco-editor')
}

// copied from https://github.com/goplus/vscode-gop/blob/dc065c1701ec54a719747ff41d2054e9ed200eb8/languages/gop.language-configuration.json
const xgoLanguageConfiguration: monaco.languages.LanguageConfiguration = {
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
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '`', close: '`', notIn: ['string'] },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' }
  ],
  indentationRules: {
    increaseIndentPattern: new RegExp(
      '^.*(\\bcase\\b.*:|\\bdefault\\b:|(\\b(func|if|else|switch|select|for|struct)\\b.*)?{[^}"\'"`]*|\\([^)"\'"`]*)$'
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

/**
 * Loads Monaco editor together with the syntax highlighter, registers the xgo language,
 * wires Shiki highlighting, and applies the language configuration. Returns the Monaco instance.
 */
export async function loadMonaco(lang: Lang): Promise<Monaco> {
  const [monacoInstance, highlighter] = await Promise.all([getMonaco(lang), getHighlighter()])
  monacoInstance.languages.register({ id: 'xgo' })
  shikiToMonaco(highlighter, monacoInstance)
  monacoInstance.languages.setLanguageConfiguration('xgo', xgoLanguageConfiguration)
  return monacoInstance
}
