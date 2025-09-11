<script lang="ts" setup>
import dayjs from 'dayjs'
import { useFileUrl } from '@/utils/file'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { Visibility } from '@/apis/common'
import { createRelease } from '@/apis/project-release'
import { saveFile } from '@/models/common/cloud'
import type { Project } from '@/models/project'
import { UIImg, UIFormModal, UIForm, UIFormItem, UITextInput, UIButton, useForm } from '@/components/ui'
import { stringifyProjectFullName } from '@/apis/project'
import { ref } from 'vue'
import { useModal } from '@/components/ui'
import MobileKeyboardEdit from './sharing/MobileKeyboard/MobileKeyboardEiditor.vue'
import type { MobileKeyboardZoneToKeyMapping } from '@/apis/project'
import { MobileKeyboardType } from '@/apis/project'
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
    project.mobileKeyboardType = keyboardMode.value
    project.mobileKeyboardZoneToKey = keyboardMode.value === 2 ? mobileKeyboardZoneToKey.value || {} : {}
    // console.log("Edit", project)
    if (project.isUsingAIInteraction()) await project.ensureAIDescription(true) // Ensure AI description is available if needed
    await project.saveToCloud()
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
// mobile
const keyboardMode = ref<MobileKeyboardType>(props.project.mobileKeyboardType ?? MobileKeyboardType.NoKeyboard)
const mobileKeyboardZoneToKey = ref<MobileKeyboardZoneToKeyMapping | null>(
  props.project.mobileKeyboardZoneToKey ?? null
)
const openKeyboardEditor = useModal(MobileKeyboardEdit as any)
async function handleEidtKeyboard() {
  const result = await openKeyboardEditor({ zoneToKeyMapping: mobileKeyboardZoneToKey.value })
  mobileKeyboardZoneToKey.value = result as MobileKeyboardZoneToKeyMapping
}
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Project publish modal', desc: 'Modal for publishing projects' }"
    :title="$t({ en: `Publish ${project.name}`, zh: `发布 ${project.name}` })"
    :style="{ width: '560px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <p v-if="project.visibility === Visibility.Private" class="tip">
        {{
          $t({
            en: 'Published projects will be visible to all XBuilder users.',
            zh: '发布后的项目将对所有 XBuilder 用户可见。'
          })
        }}
      </p>
      <div class="thumbnail-wrapper">
        <UIImg class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" size="contain" />
      </div>
      <UIFormItem :label="$t({ en: 'Release description', zh: '发布内容' })" path="releaseDescription">
        <UITextInput
          v-model:value="form.value.releaseDescription"
          v-radar="{ name: 'Release description input', desc: 'Input field for release description' }"
          type="textarea"
          :placeholder="$t({ en: 'What is new in this release?', zh: '这次发布有什么新内容？' })"
        />
      </UIFormItem>
      <!-- mobile -->
      <UIFormItem :label="$t({ en: 'Mobile keyboard', zh: '移动端键盘' })">
        <div class="kb-cards">
          <div class="kb-card" :class="{ active: keyboardMode === 1 }" @click="keyboardMode = 1">
            <div class="kb-card-title">{{ $t({ en: 'Disabled', zh: '不启动' }) }}</div>
            <div class="kb-card-desc">
              {{ $t({ en: 'Do not show on-screen keyboard on mobile.', zh: '在移动端不显示屏幕按键' }) }}
            </div>
          </div>
          <div class="kb-card" :class="{ active: keyboardMode === 2 }" @click="keyboardMode = 2">
            <div class="kb-card-title">{{ $t({ en: 'Curstom keyboard', zh: '自定义键盘' }) }}</div>
            <div class="kb-card-desc">
              {{ $t({ en: 'Design your own on-screen buttons for mobile.', zh: '为移动端自定义屏幕按键布局' }) }}
            </div>
            <div v-if="keyboardMode === 2" class="kb-actions">
              <UIButton size="small" type="primary" @click="handleEidtKeyboard">
                {{ $t({ en: 'Edit keyboard', zh: '编辑键盘' }) }}
              </UIButton>
              <span v-if="mobileKeyboardZoneToKey && Object.keys(mobileKeyboardZoneToKey).length > 0" class="kb-hint">
                {{ $t({ en: 'Configured', zh: '已配置' }) }}
              </span>
            </div>
          </div>
        </div>
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
      <footer class="footer">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel project publishing' }"
          type="boring"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Publish button', desc: 'Click to publish project' }"
          type="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
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
  background: url(@/assets/images/stage-bg.svg) center / cover no-repeat;
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

// mobile
.kb-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.kb-card {
  border: 1px solid var(--ui-color-dividing-line-2);
  border-radius: var(--ui-border-radius-1);
  padding: 12px;
  cursor: pointer;
  background: var(--ui-color-grey-100);
}

.kb-card.active {
  border-color: var(--ui-color-primary-main);
  box-shadow: 0 0 0 2px rgba(11, 192, 207, 0.15);
}

.kb-card-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.kb-card-desc {
  color: var(--ui-color-grey-800);
}

.kb-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.kb-hint {
  color: var(--ui-color-grey-800);
}
</style>
