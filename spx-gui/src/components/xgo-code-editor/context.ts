/**
 * @desc Generic context definitions for XGo Code Editor.
 * No spx-specific knowledge should be imported here.
 */

import { computed, inject, provide, toValue, type InjectionKey, type WatchSource } from 'vue'
import type { CodeEditor } from './code-editor'
import { useAppInject, useAppProvide } from '@/utils/app-state'

const codeEditorInjectionKey: InjectionKey<WatchSource<CodeEditor | null>> = Symbol('code-editor')

/**
 * Always provide locally; appWide preserves access for consumers outside the provider subtree.
 * Nested workspaces can opt out to avoid replacing the editor used by those existing consumers.
 * Migration to explicit workspace dependencies: https://github.com/goplus/builder/issues/3635
 */
export function useProvideCodeEditor(
  editorSource: WatchSource<CodeEditor | null>,
  options: { appWide?: boolean } = {}
) {
  provide(codeEditorInjectionKey, editorSource)
  if (options.appWide !== false) useAppProvide(codeEditorInjectionKey, editorSource)
}

/**
 * Inject the code editor instance as a computed ref.
 * The ref value may be null if editor is not available in senario like:
 * - The code editor is not provided, e.g. when the component is rendered outside of the editor
 * - The editor is still initializing and not ready yet
 */
export function useCodeEditorRef() {
  const local = inject(codeEditorInjectionKey, null)
  if (local != null) return computed(() => toValue(local) ?? null)
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
