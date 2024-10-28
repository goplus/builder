<script lang="ts" setup>
import dayjs from 'dayjs'
import { untilNotNull } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { Visibility } from '@/apis/common'
import { createRelease } from '@/apis/project-release'
import type { Project } from '@/models/project'
import { UIImg, UIFormModal, UIForm, UIFormItem, UITextInput, UIButton, useForm } from '@/components/ui'

const props = defineProps<{
  project: Project
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
  releaseDescription: [defaultDescription, validateText],
  projectDescription: [props.project.description ?? '', validateText],
  projectInstructions: [props.project.instructions ?? '', validateText]
})

function validateText(val: string) {
  if (val.length > 400) return t({ en: 'The input must be 400 characters or fewer', zh: '输入不能超过 400 字' })
  return null
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
    await project.saveToCloud()
    const thumbnail = await untilNotNull(thumbnailUrl)
    await createRelease({
      projectFullName: `${project.owner!}/${project.name!}`,
      name: generateReleaseName(),
      description: form.value.releaseDescription,
      thumbnail
    })
    emit('resolved')
  },
  { en: 'Failed to publish project', zh: '项目发布失败' }
)
</script>

<template>
  <UIFormModal
    :title="$t({ en: `Publish ${project.name}`, zh: `发布 ${project.name}` })"
    :style="{ width: '560px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <p v-if="project.visibility === Visibility.Private" class="tip">
        {{
          $t({
            en: 'Published projects will be visible to all Go+ Builder users.',
            zh: '发布后的项目将对所有 Go+ Builder 用户可见。'
          })
        }}
      </p>
      <div class="thumbnail-wrapper">
        <UIImg class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" size="contain" />
      </div>
      <UIFormItem :label="$t({ en: 'Release description', zh: '发布内容' })" path="releaseDescription">
        <UITextInput
          v-model:value="form.value.releaseDescription"
          type="textarea"
          :placeholder="$t({ en: 'What is new in this release?', zh: '这次发布有什么新内容？' })"
        />
      </UIFormItem>
      <UIFormItem :label="$t({ en: 'Project description', zh: '项目描述' })" path="projectDescription">
        <UITextInput
          ref="aboutProjectInput"
          v-model:value="form.value.projectDescription"
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
          type="textarea"
          :placeholder="
            $t({
              en: 'Tell others how to play in your project',
              zh: '告诉其他用户在项目中如何操作'
            })
          "
        />
      </UIFormItem>
      <footer class="footer">
        <UIButton type="boring" @click="handleCancel">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton type="primary" html-type="submit" :loading="handleSubmit.isLoading.value">
          {{ $t({ en: 'Publish', zh: '发布' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<style lang="scss" scoped>
.tip {
  margin-bottom: 24px;
}
.thumbnail-wrapper {
  margin-bottom: 24px;
  width: 100%;
  height: 224px;
  background: url(@/assets/stage-bg.svg) center / cover no-repeat;
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;

  .thumbnail {
    width: 100%;
    height: 100%;
  }
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
