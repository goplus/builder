<script lang="ts" setup>
import dayjs from 'dayjs'
import { useFileUrl } from '@/utils/file'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { Visibility } from '@/apis/common'
import { createRelease } from '@/apis/project-release'
import { cloudHelpers, saveFile } from '@/models/common/cloud'
import type { SpxProject } from '@/models/spx/project'
import { isProjectUsingAIInteraction } from '@/utils/project'
import { UIImg, UIFormModal, UIForm, UIFormItem, UITextInput, UIButton, useForm } from '@/components/ui'
import { stringifyProjectFullName } from '@/apis/project'
import stageBg from '@/assets/images/stage-bg.svg'

const props = defineProps<{
  project: SpxProject
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()
const [thumbnailUrl, thumbnailUrlLoading] = useFileUrl(() => props.project.thumbnail)

/** If this is the first time the project is published */
const firstTime = props.project.releaseCount === 0

let defaultDescription = ''
if (firstTime) {
  defaultDescription = t({
    en: '🎉 First release!',
    zh: '🎉 第一版正式发布！'
  })
}

const form = useForm({
  releaseDescription: [defaultDescription, validateReleaseDescription],
  projectDescription: [props.project.description ?? '', validateText],
  projectInstructions: [props.project.instructions ?? '', validateText]
})

function validateText(val: string) {
  if (val.length > 400) return t({ en: 'The input must be 400 characters or fewer', zh: '输入不能超过 400 字' })
  return null
}

function validateReleaseDescription(val: string) {
  if (val.trim() === '') return t({ en: 'Release description is required', zh: '发布内容不能为空' })
  return validateText(val)
}

function handleCancel() {
  emit('cancelled')
}

function generateReleaseName() {
  const timeStr = dayjs().tz('UTC').format('YYYYMMDDHHmmss')
  const build = `${timeStr}.${Math.random().toString(16).slice(2, 8)}`
  return `v0.0.0+${build}`
}

const handleSubmit = useMessageHandle(
  async () => {
    const project = props.project
    project.setVisibility(Visibility.Public)
    project.setDescription(form.value.projectDescription)
    project.setInstructions(form.value.projectInstructions)
    if (isProjectUsingAIInteraction(project)) await project.ensureAIDescription(true) // Ensure AI description is available if needed
    const serialized = await project.export()
    const saved = await cloudHelpers.save(serialized)
    project.setMetadata(saved.metadata)
    const thumbnailUniversalUrl = await saveFile(props.project.thumbnail!)
    await createRelease({
      projectFullName: stringifyProjectFullName(project.owner!, project.name!),
      name: generateReleaseName(),
      description: form.value.releaseDescription,
      thumbnail: thumbnailUniversalUrl
    })
    emit('resolved')
  },
  { en: 'Failed to publish project', zh: '项目发布失败' }
)
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Project publish modal', desc: 'Modal for publishing projects' }"
    :title="$t({ en: `Publish ${project.displayName}`, zh: `发布 ${project.displayName}` })"
    :style="{ width: '560px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <p v-if="project.visibility === Visibility.Private" class="mb-6">
        {{
          $t({
            en: 'Published projects will be visible to all XBuilder users.',
            zh: '发布后的项目将对所有 XBuilder 用户可见。'
          })
        }}
      </p>
      <div
        class="mb-6 h-56 w-full overflow-hidden rounded-1 bg-center bg-cover bg-no-repeat"
        :style="{ backgroundImage: `url(${stageBg})` }"
      >
        <UIImg class="h-full w-full" :src="thumbnailUrl" :loading="thumbnailUrlLoading" size="contain" />
      </div>
      <UIFormItem :label="$t({ en: 'Release description', zh: '发布内容' })" path="releaseDescription">
        <UITextInput
          v-model:value="form.value.releaseDescription"
          v-radar="{ name: 'Release description input', desc: 'Input field for release description' }"
          type="textarea"
          :placeholder="$t({ en: 'What is new in this release?', zh: '这次发布有什么新内容？' })"
        />
      </UIFormItem>
      <UIFormItem :label="$t({ en: 'Project description', zh: '项目描述' })" path="projectDescription">
        <UITextInput
          ref="aboutProjectInput"
          v-model:value="form.value.projectDescription"
          v-radar="{ name: 'Project description input', desc: 'Input field for project description' }"
          type="textarea"
          :placeholder="
            $t({
              en: 'What is this project about? How did you make it?',
              zh: '这个项目是关于什么的？你是如何创作的？'
            })
          "
        />
      </UIFormItem>
      <UIFormItem :label="$t({ en: 'Play instructions', zh: '操作说明' })" path="projectInstructions">
        <UITextInput
          v-model:value="form.value.projectInstructions"
          v-radar="{ name: 'Play instructions input', desc: 'Input field for project play instructions' }"
          type="textarea"
          :placeholder="
            $t({
              en: 'Tell others how to play in your project',
              zh: '告诉其他用户在项目中如何操作'
            })
          "
        />
      </UIFormItem>
      <footer class="mt-5 flex justify-end gap-3">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel project publishing' }"
          color="boring"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Publish button', desc: 'Click to publish project' }"
          color="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
          {{ $t({ en: 'Publish', zh: '发布' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>
