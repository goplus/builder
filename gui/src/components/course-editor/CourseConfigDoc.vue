<script setup lang="ts">
/** The course root's document: the course settings stored in `index.json`. */
import { computed, onUnmounted } from 'vue'
import { Cancelled, DefaultException, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { generatePlaygroundCourseCopilotContext } from '@/apis/course'
import { saveFiles } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UITextInput, useMessage } from '@/components/ui'
import type { Action, History } from '@/components/editor/history'

const props = defineProps<{
  /** The author's working copy of the Tutorial project. */
  project: TutorialProject
  /** The course's own history, which records every change made here. */
  history: History
}>()

// Typing in one field is recorded as one step, as long as nothing else is done in between.
const editInEditorPathAction: Action = {
  name: { en: "Update learner's initial view", zh: '修改学习者初始视图' },
  mergeable: true
}
const editCopilotContextAction: Action = {
  name: { en: 'Update Copilot context', zh: '修改 Copilot 上下文' },
  mergeable: true
}

const { t } = useI18n()
const m = useMessage()

const config = computed(() => {
  const config = props.project.config
  // This document is never rendered before the project is loaded; fail loudly if that changes.
  if (config == null) throw new Error('Tutorial project has not been loaded')
  return config
})

// Aborted on unmount: the result of a request that outlives this document must never be written into the course.
let generateController: AbortController | null = null

const handleGenerateCopilotContext = useMessageHandle(
  async () => {
    const controller = new AbortController()
    generateController = controller
    const { signal } = controller
    // Remember what the author had when the request started; a result only replaces that exact text.
    const contextBefore = config.value.copilotContext
    try {
      // The endpoint reads the author's current (unsaved) work, so the working copy is uploaded first. This does
      // not save the course.
      const { metadata, files } = await props.project.export()
      const { fileCollection } = await m.withLoading(
        saveFiles(files, signal),
        t({ en: 'Uploading course files...', zh: '上传课程文件中...' })
      )
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
      await props.history.doAction({ name: { en: 'Generate Copilot context', zh: '生成 Copilot 上下文' } }, () =>
        props.project.setConfig({ copilotContext })
      )
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

// The inputs are locked while generating so the result cannot race an edit.
const generating = computed(() => handleGenerateCopilotContext.isLoading.value)

onUnmounted(() => {
  generateController?.abort(new Cancelled('unmounted'))
})
</script>

<template>
  <div class="flex h-full flex-col gap-4 overflow-y-auto p-3 text-sm">
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
    <label class="flex flex-col gap-1">
      <span class="text-grey-700">{{
        $t({ en: "Learner's initial view (path inside the Project Editor)", zh: '学习者初始视图（工程编辑器内路径）' })
      }}</span>
      <UITextInput
        v-radar="{
          name: 'initial-editor-path-input',
          desc: 'Input for the in-editor path opened when the course starts'
        }"
        :value="config.inEditorPath"
        :disabled="generating"
        placeholder="/sprites/Lita/code"
        @update:value="(v) => history.doAction(editInEditorPathAction, () => project.setConfig({ inEditorPath: v }))"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-grey-700">{{ $t({ en: 'Copilot context', zh: 'Copilot 上下文' }) }}</span>
      <UITextInput
        v-radar="{ name: 'copilot-context-input', desc: 'Input for the course-author-provided Copilot instructions' }"
        type="textarea"
        :rows="10"
        :value="config.copilotContext"
        :disabled="generating"
        @update:value="
          (v) => history.doAction(editCopilotContextAction, () => project.setConfig({ copilotContext: v }))
        "
      />
    </label>
    <UIButton
      v-radar="{
        name: 'generate-copilot-context-button',
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
