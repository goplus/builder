<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { generatePlaygroundCourseCopilotContext } from '@/apis/course'
import { saveFiles } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UITextInput, useMessage } from '@/components/ui'
import ThumbnailUploader from '@/components/course/management/ThumbnailUploader.vue'

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
  <div class="flex h-full flex-col gap-4 overflow-y-auto p-3 text-sm">
    <label class="flex flex-col gap-1">
      <span class="text-grey-700">{{ $t({ en: 'Title', zh: '标题' }) }}</span>
      <UITextInput
        v-radar="{ name: 'Course title input', desc: 'Input for the course title' }"
        :value="project.title"
        @update:value="(v) => project.setMetadata({ title: v })"
      />
    </label>
    <div class="flex flex-col gap-1">
      <span class="text-grey-700">{{ $t({ en: 'Thumbnail', zh: '缩略图' }) }}</span>
      <ThumbnailUploader
        v-radar="{ name: 'Course thumbnail uploader', desc: 'Click to upload the course thumbnail' }"
        class="h-32 w-full"
        :thumbnail="project.thumbnail"
        @update:thumbnail="(v) => project.setMetadata({ thumbnail: v })"
      />
    </div>
    <label class="flex flex-col gap-1">
      <span class="text-grey-700">{{ $t({ en: 'Initial editor path', zh: '初始编辑器路径' }) }}</span>
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
