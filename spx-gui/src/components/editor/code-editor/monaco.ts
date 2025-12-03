import type * as monaco from 'monaco-editor'

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

export async function getMonaco(lang: Lang) {
  // Now there's no official solution for localization of ESM version Monaco,
  // see details in https://github.com/microsoft/monaco-editor/issues/1514.
  // While it is no big deal as now most UIs (with text) in code-editor are implemented by ourselves in Builder.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  lang // TODO: Do localization for monaco
  return import('monaco-editor')
}
