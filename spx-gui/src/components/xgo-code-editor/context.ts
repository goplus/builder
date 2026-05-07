/**
 * @desc Generic context definitions for XGo Code Editor.
 * No spx-specific knowledge should be imported here.
 */

import { computed, toValue, type InjectionKey, type WatchSource } from 'vue'
import type { CodeEditor } from './code-editor'
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
