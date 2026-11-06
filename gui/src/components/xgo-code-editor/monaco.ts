import { shikiToMonaco } from '@shikijs/monaco'
import type * as monaco from 'monaco-editor'
import { getHighlighter } from '@/utils/xgo/highlighter'
import rawXgoLanguageConfiguration from '@/utils/xgo/language-configuration.json'

export type { monaco }
export type Monaco = typeof monaco
export type MonacoEditor = monaco.editor.IStandaloneCodeEditor

declare module 'monaco-editor' {
  namespace editor {
    interface IStandaloneCodeEditor {
      // It is actually supported while not in the type definition
      onDidType: (callback: (text: string) => void) => monaco.IDisposable
    }

    interface IMouseTargetContentTextData {
      // It is available at runtime while missing from the type definition
      readonly injectedText: { readonly options: InjectedTextOptions } | null
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

const xgoLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: rawXgoLanguageConfiguration.comments as monaco.languages.CommentRule,
  brackets: rawXgoLanguageConfiguration.brackets as monaco.languages.CharacterPair[],
  autoClosingPairs: rawXgoLanguageConfiguration.autoClosingPairs.map((pair) =>
    Array.isArray(pair) ? { open: pair[0], close: pair[1] } : pair
  ),
  surroundingPairs: rawXgoLanguageConfiguration.surroundingPairs.map(([open, close]) => ({ open, close })),
  indentationRules: {
    increaseIndentPattern: new RegExp(rawXgoLanguageConfiguration.indentationRules.increaseIndentPattern),
    // Deliberately override the JSON's decreaseIndentPattern to also handle `else` & `else if`.
    // Keep the base rules in sync when updating the upstream JSON.
    decreaseIndentPattern: new RegExp('^\\s*(\\bcase\\b.*:|\\bdefault\\b:|}[)}]*[),]?|}\\s*else\\b.*{|\\)[,]?)$')
  },
  folding: {
    markers: {
      start: new RegExp(rawXgoLanguageConfiguration.folding.markers.start),
      end: new RegExp(rawXgoLanguageConfiguration.folding.markers.end)
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
