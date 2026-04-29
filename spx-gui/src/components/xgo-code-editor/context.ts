/**
 * @desc Generic context definitions for XGo Code Editor.
 * No spx-specific knowledge should be imported here.
 */

import { computed, toValue, type InjectionKey, type WatchSource } from 'vue'
import type { CodeEditor } from './code-editor'
import { DiagnosticSeverity } from './common'
import { useAppInject, useAppProvide } from '@/utils/app-state'

const codeEditorInjectionKey: InjectionKey<WatchSource<CodeEditor | null>> = Symbol('code-editor')

export function useProvideCodeEditor(editorSource: WatchSource<CodeEditor | null>) {
  useAppProvide(codeEditorInjectionKey, editorSource)
}

/**
 * Inject the code editor instance as a computed ref.
 * The ref value may be null if editor is not available in senario like:
 * - The code editor is not provided, e.g. when the component is rendered outside of the editor
 * - The editor is still initializing and not ready yet
 */
export function useCodeEditorRef() {
  const ref = useAppInject(codeEditorInjectionKey)
  return computed(() => {
    if (ref.value == null) return null
    return toValue(ref.value) ?? null
  })
}

/** Inject the code editor instance directly. Throws if it is not available. */
export function useCodeEditor(): CodeEditor {
  const ref = useCodeEditorRef()
  if (ref.value == null) throw new Error('CodeEditor not available')
  return ref.value
}

// There may be errors in the project code when renaming resource/symbol, which may cause some references to be updated incorrectly.
// This function is used to provide warning for errors in the project code when renaming: we notify the user to check the code and update the references manually.
export function useRenameWarning() {
  const codeEditorRef = useCodeEditorRef()
  return async function getRenameWarning() {
    const editor = codeEditorRef.value
    if (editor == null) throw new Error('CodeEditor not available')
    const r = await editor.diagnosticWorkspace()
    const hasError = r.items.some((i) => i.diagnostics.some((d) => d.severity === DiagnosticSeverity.Error))
    if (!hasError) return null
    return {
      en: 'There are errors in the project code. Some references may not be updated automatically. You can check the code and update them manually after renaming.',
      zh: '当前项目代码中存在错误，部分引用可能不会自动更新，你可以在重命名后检查代码并手动修改。'
    }
  }
}
