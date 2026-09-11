<script setup lang="ts">
/**
 * Purpose: The document shown for the course root: the course settings stored in `index.json`
 * (`TutorialProjectConfig`). It edits `inEditorPath` (the learner's initial view inside the Project Editor) and
 * `copilotContext`, and can ask the backend to generate the Copilot context from the current course content.
 * Title and thumbnail are course metadata edited in course management, so they are shown but not editable here.
 * Every edit goes straight into the model via `TutorialProject.setConfig()`; `CourseEditor` picks the change up
 * through `exportFiles()` and marks the course unsaved.
 *
 * Props:
 * - `project`: the author's working copy of the Tutorial project (config is read and written on it).
 *
 * Emits: none.
 *
 * Used by: `components/course-editor/CourseEditor.vue#template` (when `doc.type === 'root'`).
 *
 * Uses: UIButton, UITextInput, `useMessage` (loading toasts), `useMessageHandle` (error toast), `saveFiles`
 * (uploads the working copy), `apis/course#generatePlaygroundCourseCopilotContext`.
 */
import { computed, onUnmounted } from 'vue'
import { Cancelled, DefaultException, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { generatePlaygroundCourseCopilotContext } from '@/apis/course'
import { saveFiles } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UITextInput, useMessage } from '@/components/ui'

const props = defineProps<{
  /** The author's working copy of the Tutorial project; its `config` is edited in place. */
  project: TutorialProject
}>()

const { t } = useI18n()
const m = useMessage()

/**
 * The Tutorial project's config, narrowed to non-null (the editor only shows this document once the project is
 * loaded). Reading `props.project.config` keeps it reactive to `setConfig()`, which replaces the object.
 * @returns The current `TutorialProjectConfig`.
 * @throws Error when the project has not been loaded (`config == null`).
 * Read by: `CourseConfigDoc.vue#template` (the two inputs' `:value`).
 * Called by: Vue (computed; re-evaluated when `props.project.config` changes)
 */
const config = computed(() => {
  const config = props.project.config
  // Guard: this document is never rendered before the project is loaded; fail loudly if that changes.
  if (config == null) throw new Error('Tutorial project has not been loaded')
  return config
})

/**
 * "Generate with Copilot": upload a snapshot of the author's current (unsaved) work, ask the backend for a
 * Copilot context derived from it, and write the result into the config. Two loading toasts show the two phases.
 * Nothing is saved to the course itself; the author still has to press Save.
 * @returns Promise<void>; side effects: uploads files, one backend call, `project.setConfig({ copilotContext })`.
 * Called by: `components/course-editor/CourseConfigDoc.vue#template` ("Generate with Copilot" button
 * `@click="handleGenerateCopilotContext.fn"`; its `isLoading` drives the button's `:loading`)
 */
/**
 * Purpose: the in-flight generation request, so it can be aborted when this document goes away. The result of a
 * request that outlives the document must never be written into the course.
 * Written by: `handleGenerateCopilotContext` (set on start, cleared on settle); read by `onUnmounted`.
 */
let generateController: AbortController | null = null

const handleGenerateCopilotContext = useMessageHandle(
  async () => {
    // One request at a time, bound to this document instance: aborted on unmount, see `onUnmounted` below.
    const controller = new AbortController()
    generateController = controller
    const { signal } = controller
    // Remember what the author had when the request started; a result only replaces that exact text.
    const contextBefore = config.value.copilotContext
    try {
      // The endpoint reads the author's current (unsaved) work, so the working copy is uploaded first.
      const { metadata, files } = await props.project.snapshot()
      // Phase 1: upload every record; yields the file collection the backend can read.
      const { fileCollection } = await m.withLoading(
        saveFiles(files, signal),
        t({ en: 'Uploading course files...', zh: '上传课程文件中...' })
      )
      // Phase 2: ask the backend to generate the context from title, thumbnail and content.
      const { copilotContext } = await m.withLoading(
        generatePlaygroundCourseCopilotContext(
          {
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            content: fileCollection
          },
          signal
        ),
        t({ en: 'Generating Copilot context...', zh: '生成 Copilot 上下文中...' })
      )
      // Never write a result that arrived after the document was left (belt and braces next to the abort).
      signal.throwIfAborted()
      // The inputs are disabled while generating, so a changed value means another path edited the course
      // meanwhile; refuse to overwrite it silently.
      if (config.value.copilotContext !== contextBefore) {
        throw new DefaultException({
          en: 'The Copilot context changed while generating, so the generated text was not applied',
          zh: '生成期间 Copilot 上下文已被修改，生成结果未应用'
        })
      }
      // Write the result into the config; the textarea below reflects it and the course becomes unsaved.
      props.project.setConfig({ copilotContext })
    } catch (error) {
      // Whatever a layer turned the abort into, an aborted generation is a cancellation, not a failure.
      if (signal.aborted) throw new Cancelled('unmounted')
      throw error
    } finally {
      if (generateController === controller) generateController = null
    }
  },
  { en: 'Failed to generate Copilot context', zh: '生成 Copilot 上下文失败' }
)

/**
 * Purpose: whether a generation is in flight; the inputs are locked meanwhile so the result cannot race an edit.
 * Read by: `CourseConfigDoc.vue#template` (`disabled` of the inputs, `loading` of the button).
 */
const generating = computed(() => handleGenerateCopilotContext.isLoading.value)

/**
 * Purpose: abort the in-flight generation when the document is closed (another node opened, preview entered,
 * editor left). `Cancelled` is ignored by `useMessageHandle`, so no error toast follows.
 * Called by: Vue lifecycle (onUnmounted).
 */
onUnmounted(() => {
  generateController?.abort(new Cancelled('unmounted'))
})
</script>

<template>
  <!-- The course settings stored in `index.json`. Title and thumbnail are course metadata, edited in course management. -->
  <!-- Scrollable form column: heading, the two editable settings, and the generate button. -->
  <div class="flex h-full flex-col gap-4 overflow-y-auto p-3 text-sm">
    <!-- Heading: the course title (read-only here) and a note on where title/thumbnail are edited. -->
    <div class="flex flex-col gap-1">
      <h2 class="m-0 truncate text-base font-semibold" :title="project.title">{{ project.title }}</h2>
      <p class="m-0 text-grey-700">
        {{
          $t({
            en: 'The title and thumbnail are edited in course management. Settings below are stored with the course files.',
            zh: '标题和缩略图在课程管理中修改。下面的设置随课程文件保存。'
          })
        }}
      </p>
    </div>
    <!-- `inEditorPath`: the Project Editor path opened when a learner starts the course; written on every edit. -->
    <label class="flex flex-col gap-1">
      <span class="text-grey-700">{{
        $t({ en: "Learner's initial view (path inside the Project Editor)", zh: '学习者初始视图（工程编辑器内路径）' })
      }}</span>
      <UITextInput
        v-radar="{
          name: 'Initial editor path input',
          desc: 'Input for the in-editor path opened when the course starts'
        }"
        :value="config.inEditorPath"
        :disabled="generating"
        placeholder="/sprites/Lita/code"
        @update:value="(v) => project.setConfig({ inEditorPath: v })"
      />
    </label>
    <!-- `copilotContext`: free-text instructions for Copilot, edited by hand or filled by the button below. -->
    <label class="flex flex-col gap-1">
      <span class="text-grey-700">{{ $t({ en: 'Copilot context', zh: 'Copilot 上下文' }) }}</span>
      <UITextInput
        v-radar="{ name: 'Copilot context input', desc: 'Input for the course-author-provided Copilot instructions' }"
        type="textarea"
        :rows="10"
        :value="config.copilotContext"
        :disabled="generating"
        @update:value="(v) => project.setConfig({ copilotContext: v })"
      />
    </label>
    <!-- Generate button: runs `handleGenerateCopilotContext`; shows a spinner while it runs. -->
    <UIButton
      v-radar="{
        name: 'Generate Copilot context button',
        desc: 'Click to generate the Copilot context from the current course content'
      }"
      type="secondary"
      size="small"
      :loading="generating"
      @click="handleGenerateCopilotContext.fn"
    >
      {{ $t({ en: 'Generate with Copilot', zh: '用 Copilot 生成' }) }}
    </UIButton>
  </div>
</template>
