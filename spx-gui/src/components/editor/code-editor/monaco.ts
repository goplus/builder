import type * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import loader from '@monaco-editor/loader'

export type { monaco }
export type Monaco = typeof import('monaco-editor')
export type MonacoEditor = monaco.editor.IStandaloneCodeEditor
export { KeyCode as MonacoKeyCode } from 'monaco-editor'

declare module 'monaco-editor' {
  namespace editor {
    interface IStandaloneCodeEditor {
      // It is actually supported while not in the type definition
      onDidType: (callback: (text: string) => void) => monaco.IDisposable
    }
  }
}

let monacoPromise: Promise<Monaco> | null = null

export type Lang = 'en' | 'zh'

function getLoaderConfig(lang: Lang) {
  const loaderConfig = {
    paths: {
      vs: 'https://builder-static.gopluscdn.com/libs/monaco-editor/0.45.0/min/vs'
    }
  }
  if (lang === 'en') return loaderConfig
  const locale: string = {
    zh: 'zh-cn'
  }[lang]
  return {
    ...loaderConfig,
    'vs/nls': {
      availableLanguages: {
        '*': locale
      }
    }
  }
}

window.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker()
  }
}

export async function getMonaco(lang: Lang) {
  if (monacoPromise != null) return monacoPromise
  // now refreshing page required if lang changed
  loader.config(getLoaderConfig(lang))
  return (monacoPromise = loader.init())
}
