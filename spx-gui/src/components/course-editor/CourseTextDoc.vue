<script setup lang="ts">
/**
 * Purpose: A controlled plain-text editor (Monaco) for one text record of the course: the course program
 * (`main_course.gox`), a text resource payload, or an unused text file. It loads Monaco for the current UI
 * language, shows loading/error states meanwhile, and keeps the editor content and the `text` prop in sync in
 * both directions: local edits are emitted, external changes to `text` are pushed into the editor. No language
 * server is attached yet (see the note on `editorOptions`).
 *
 * Props:
 * - `text`: the current text; the single source of truth (the editor is re-synced whenever it changes).
 * - `language`: Monaco language id (`xgo`, `plaintext`, `json`, ...); falls back to `plaintext` when the loaded
 *   Monaco does not know it.
 *
 * Emits:
 * - `update:text(text)`: the author edited the content; carries the full new text. Listened by
 *   `components/course-editor/CourseEditor.vue#template` (`project.mainCourse.setCode(text)`),
 *   `components/course-editor/CourseResourceDoc.vue#template` (`handleTextChange`) and
 *   `components/course-editor/CourseFileDoc.vue#template` (`handleTextChange`).
 *
 * Used by: `components/course-editor/CourseEditor.vue#template` (course program),
 * `components/course-editor/CourseResourceDoc.vue#template` (text payload of a resource package),
 * `components/course-editor/CourseFileDoc.vue#template` (unused text record).
 *
 * Uses: `xgo-code-editor/ui/MonacoEditor.vue` (creates the editor instance and emits `init`),
 * `xgo-code-editor#loadMonaco`, `useQuery`, `useI18n`, UIDetailedLoading, UIError, and the highlighter
 * constants `theme` / `tabSize` / `insertSpaces`.
 */
import { computed, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useQuery } from '@/utils/query'
import { insertSpaces, tabSize, theme } from '@/utils/xgo/highlighter'
import { loadMonaco, type MonacoEditor, type monaco } from '@/components/xgo-code-editor'
import MonacoEditorComp from '@/components/xgo-code-editor/ui/MonacoEditor.vue'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  /** The current text; the component follows it and reports edits through `update:text`. */
  text: string
  /** Monaco language id; falls back to plain text when the loaded Monaco does not know it. */
  language: string
}>()

const emit = defineEmits<{
  /** The author edited the content; carries the complete new text. */
  'update:text': [text: string]
}>()

const i18n = useI18n()

/**
 * The Monaco loading query: resolves to the `Monaco` namespace for the current UI language. Reading
 * `i18n.lang.value` inside the query function makes it re-run on a language switch, which re-creates the editor.
 * Read by: `editorOptions` (language check), `CourseTextDoc.vue#template` (loading / error / editor branches,
 * `:retry`).
 * Called by: Vue (`useQuery` runs it on setup and whenever `i18n.lang` changes)
 */
const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})

// Plain text editing for now; completion and diagnostics for course programs wait for the Tutorial Language Server.
/**
 * Construction options for the Monaco editor: the requested language when the loaded Monaco registers it
 * (`plaintext` otherwise), the shared XGo theme and indentation settings, a small font and no context menu.
 * @returns `IStandaloneEditorConstructionOptions` passed to `MonacoEditorComp`.
 * Read by: `CourseTextDoc.vue#template` (`:options`).
 * Called by: Vue (computed; re-evaluated when Monaco finishes loading or `props.language` changes)
 */
const editorOptions = computed<monaco.editor.IStandaloneEditorConstructionOptions>(() => {
  const loaded = monacoQueryRet.data.value
  // Only languages the loaded Monaco knows are valid ids; anything else would make Monaco warn and fall back.
  const known = loaded != null && loaded.languages.getLanguages().some((l) => l.id === props.language)
  return {
    language: known ? props.language : 'plaintext',
    theme,
    tabSize,
    insertSpaces,
    fontSize: 12,
    contextmenu: false
  }
})

/**
 * Wire a freshly created Monaco editor to the `text` prop: seed it with the current text, emit local edits, push
 * external changes into it, and stop both when the editor is disposed. Because this runs outside setup, the
 * `watch` below is not tied to the component scope and is stopped by hand on dispose.
 * @param editor - The `IStandaloneCodeEditor` instance created by `MonacoEditorComp`.
 * @returns void; side effects: sets the editor content, registers a content listener, a watcher and a dispose
 * hook.
 * Called by: `components/xgo-code-editor/ui/MonacoEditor.vue` (`emit('init', editor)` once the editor exists),
 * through `components/course-editor/CourseTextDoc.vue#template` (`@init="handleEditorInit"`)
 */
function handleEditorInit(editor: MonacoEditor) {
  // The editor is re-created when Monaco reloads (e.g. on language change), so always start from the
  // current text rather than whatever the component captured at setup.
  editor.setValue(props.text)
  /**
   * Editor -> prop: report each local edit, unless the content already equals `props.text` (which is the case
   * right after `setValue` from the watcher below, avoiding an echo).
   * @returns void; side effect: emits `update:text`.
   * Called by: Monaco (`onDidChangeModelContent` event)
   */
  const contentListener = editor.onDidChangeModelContent(() => {
    const text = editor.getValue()
    if (text !== props.text) emit('update:text', text)
  })
  /**
   * Prop -> editor: when `text` changes from outside (undo elsewhere, a different record with the same key),
   * replace the editor content, unless it already matches (the common case after a local edit was emitted).
   * @param text - The new `props.text`.
   * @returns void; side effect: `editor.setValue`.
   * Called by: Vue (watch on `props.text`, created inside `handleEditorInit`)
   */
  const stopModelSync = watch(
    () => props.text,
    (text) => {
      if (editor.getValue() !== text) editor.setValue(text)
    }
  )
  // `MonacoEditorComp` disposes the editor on unmount / re-creation; release both bindings with it.
  editor.onDidDispose(() => {
    contentListener.dispose()
    stopModelSync()
  })
}
</script>

<template>
  <!-- While Monaco loads: a progress placeholder driven by the query's progress. -->
  <UIDetailedLoading v-if="monacoQueryRet.isLoading.value" :percentage="monacoQueryRet.progress.value.percentage">
    <span>{{ $t({ en: 'Loading code editor...', zh: '加载代码编辑器中...' }) }}</span>
  </UIDetailedLoading>
  <!-- Monaco failed to load: show the user message with a retry that re-runs the query. -->
  <UIError v-else-if="monacoQueryRet.error.value != null" :retry="monacoQueryRet.refetch">
    {{ $t(monacoQueryRet.error.value.userMessage) }}
  </UIError>
  <!-- Monaco is ready: the editor fills the document; `@init` hands the created instance to `handleEditorInit`. -->
  <MonacoEditorComp
    v-else-if="monacoQueryRet.data.value != null"
    v-radar="{ name: 'Text editor', desc: 'Code editor for the open text file' }"
    class="h-full w-full"
    :monaco="monacoQueryRet.data.value"
    :options="editorOptions"
    @init="handleEditorInit"
  />
</template>
