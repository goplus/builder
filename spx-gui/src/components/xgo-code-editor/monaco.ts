import { shikiToMonaco } from '@shikijs/monaco'
import type * as monaco from 'monaco-editor'
import { getHighlighter } from '@/utils/xgo/highlighter'
import xgoLanguageConfiguration from '@/utils/xgo/language-configuration.json'

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

/**
 * Loads Monaco editor together with the syntax highlighter, registers the xgo language,
 * wires Shiki highlighting, and applies the language configuration. Returns the Monaco instance.
 */
export async function loadMonaco(lang: Lang): Promise<Monaco> {
  const [monacoInstance, highlighter] = await Promise.all([getMonaco(lang), getHighlighter()])
  monacoInstance.languages.register({ id: 'xgo' })
  shikiToMonaco(highlighter, monacoInstance)
  monacoInstance.languages.setLanguageConfiguration('xgo', {
    comments: xgoLanguageConfiguration.comments as monaco.languages.CommentRule,
    brackets: xgoLanguageConfiguration.brackets as monaco.languages.CharacterPair[],
    autoClosingPairs: xgoLanguageConfiguration.autoClosingPairs.map((pair) =>
      Array.isArray(pair) ? { open: pair[0], close: pair[1] } : pair
    ),
    surroundingPairs: xgoLanguageConfiguration.surroundingPairs.map(([open, close]) => ({ open, close })),
    indentationRules: {
      increaseIndentPattern: new RegExp(xgoLanguageConfiguration.indentationRules.increaseIndentPattern),
      // Decrease indent for `else` & `else if` in addition to the upstream rules.
      decreaseIndentPattern: new RegExp('^\\s*(\\bcase\\b.*:|\\bdefault\\b:|}[)}]*[),]?|}\\s*else\\b.*{|\\)[,]?)$')
    },
    folding: {
      markers: {
        start: new RegExp(xgoLanguageConfiguration.folding.markers.start),
        end: new RegExp(xgoLanguageConfiguration.folding.markers.end)
      }
    }
  })
  return monacoInstance
}
