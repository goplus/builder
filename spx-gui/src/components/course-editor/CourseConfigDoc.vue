<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { generatePlaygroundCourseCopilotContext } from '@/apis/course'
import { saveFiles } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UITextInput, useMessage } from '@/components/ui'

const props = defineProps<{
  project: TutorialProject
}>()

const { t } = useI18n()
const m = useMessage()

const config = computed(() => {
  const config = props.project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')
  return config
})

const handleGenerateCopilotContext = useMessageHandle(
  async () => {
    // The endpoint reads the author's current (unsaved) work, so the working copy is uploaded first.
    const { metadata, files } = await props.project.snapshot()
    const { fileCollection } = await m.withLoading(
      saveFiles(files),
      t({ en: 'Uploading course files...', zh: '上传课程文件中...' })
    )
    const { copilotContext } = await m.withLoading(
      generatePlaygroundCourseCopilotContext({
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        content: fileCollection
      }),
      t({ en: 'Generating Copilot context...', zh: '生成 Copilot 上下文中...' })
    )
    props.project.setConfig({ copilotContext })
  },
  { en: 'Failed to generate Copilot context', zh: '生成 Copilot 上下文失败' }
)
</script>

<template>
  <!-- The course settings stored in `index.json`. Title and thumbnail are course metadata, edited in course management. -->
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
          name: 'Initial editor path input',
          desc: 'Input for the in-editor path opened when the course starts'
        }"
        :value="config.inEditorPath"
        placeholder="/sprites/Lita/code"
        @update:value="(v) => project.setConfig({ inEditorPath: v })"
      />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-grey-700">{{ $t({ en: 'Copilot context', zh: 'Copilot 上下文' }) }}</span>
      <UITextInput
        v-radar="{ name: 'Copilot context input', desc: 'Input for the course-author-provided Copilot instructions' }"
        type="textarea"
        :rows="10"
        :value="config.copilotContext"
        @update:value="(v) => project.setConfig({ copilotContext: v })"
      />
    </label>
    <UIButton
      v-radar="{
        name: 'Generate Copilot context button',
        desc: 'Click to generate the Copilot context from the current course content'
      }"
      type="secondary"
      size="small"
      :loading="handleGenerateCopilotContext.isLoading.value"
      @click="handleGenerateCopilotContext.fn"
    >
      {{ $t({ en: 'Generate with Copilot', zh: '用 Copilot 生成' }) }}
    </UIButton>
  </div>
</template>
