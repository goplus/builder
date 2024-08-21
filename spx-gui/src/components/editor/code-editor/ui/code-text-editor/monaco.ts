import type { I18n } from '@/utils/i18n'
import type { FormatResponse } from '@/apis/util'
import formatWasm from '@/assets/format.wasm?url'
import { getAllTools } from './tools'
import type { IDisposable } from 'monaco-editor'
import type { Project } from '@/models/project'

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
/**
 * this is to be removed function, it will be removed after pr #771(https://github.com/goplus/builder/pull/771) is merged.
 * this function includes `hoverProvider` this provider is a single feature so current file need to be kept
 */
export async function initMonaco_ToBeRemoved(
  monaco: typeof import('monaco-editor'),
  i18n: I18n,
  getProject: () => Project
) {
  const LANGUAGE_NAME = 'spx'
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
}

/**
 * the same reason as `initMonaco_ToBeRemoved`.
 * providers need to be disposed before the editor is destroyed.
 * otherwise, in current file will cause duplicate completion items when HMR is triggered in development mode.
 */
export function disposeMonacoProviders_ToBeRemoved() {
  if (monacoProviderDisposes.completionProvider) {
    monacoProviderDisposes.completionProvider.dispose()
    monacoProviderDisposes.completionProvider = null
  }
  if (monacoProviderDisposes.hoverProvider) {
    monacoProviderDisposes.hoverProvider.dispose()
    monacoProviderDisposes.hoverProvider = null
  }
}
