<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { addCourse, updateCourse, type Course, type AddUpdateCourseParams } from '@/apis/course'
import { UIFormModal, UIForm, UIFormItem, UITextInput, UIButton, useMessage, useForm } from '@/components/ui'
import ThumbnailUploader from './ThumbnailUploader.vue'
import ProjectReferencesInput from './ProjectReferencesInput.vue'

const props = defineProps<{
  visible: boolean
  course: Course | null
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const i18n = useI18n()
const m = useMessage()

const isEditMode = computed(() => props.course !== null)
const modalTitle = computed(() =>
  isEditMode.value ? i18n.t({ en: 'Edit course', zh: '编辑课程' }) : i18n.t({ en: 'Create course', zh: '创建课程' })
)

const form = useForm({
  title: [
    props.course?.title || '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please enter course title', zh: '请输入课程标题' })
      return null
    }
  ],
  entrypoint: [
    props.course?.entrypoint || '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please enter entrypoint', zh: '请输入起始地址' })
      if (!/^\/.*$/.test(v)) return i18n.t({ en: 'URL must start with /', zh: 'URL 必须以 / 开头' })
      return null
    }
  ],
  thumbnail: [
    props.course?.thumbnail || '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please upload a thumbnail', zh: '请上传缩略图' })
      return null
    }
  ],
  references: [props.course?.references || []],
  prompt: [
    props.course?.prompt || '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please enter Copilot prompt', zh: '请输入 Copilot 提示词' })
      return null
    }
  ]
})

const handleSubmit = useMessageHandle(
  async () => {
    const formData: AddUpdateCourseParams = {
      title: form.value.title,
      thumbnail: form.value.thumbnail,
      entrypoint: form.value.entrypoint,
      references: form.value.references,
      prompt: form.value.prompt
    }

    if (isEditMode.value && props.course) {
      await m.withLoading(updateCourse(props.course.id, formData), i18n.t({ en: 'Updating course', zh: '更新课程中' }))
      m.success(i18n.t({ en: 'Course updated successfully', zh: '课程更新成功' }))
    } else {
      await m.withLoading(addCourse(formData), i18n.t({ en: 'Creating course', zh: '创建课程中' }))
      m.success(i18n.t({ en: 'Course created successfully', zh: '课程创建成功' }))
    }

    emit('resolved')
  },
  {
    en: isEditMode.value ? 'Failed to update course' : 'Failed to create course',
    zh: isEditMode.value ? '更新课程失败' : '创建课程失败'
  }
)
</script>

<template>
  <UIFormModal
    :visible="visible"
    :title="modalTitle"
    size="large"
    :mask-closable="false"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" @submit="handleSubmit.fn">
      <div class="form-row">
        <UIFormItem path="title" :label="$t({ en: 'Title', zh: '标题' })">
          <UITextInput
            v-model:value="form.value.title"
            :placeholder="
              $t({
                en: 'Enter course title',
                zh: '请输入课程标题'
              })
            "
          />
        </UIFormItem>

        <UIFormItem path="entrypoint" :label="$t({ en: 'Entrypoint', zh: '起始地址' })">
          <UITextInput
            v-model:value="form.value.entrypoint"
            :placeholder="
              $t({
                en: 'e.g., / or /editor/owner/project',
                zh: '例如：/ 或 /editor/owner/project'
              })
            "
          />
        </UIFormItem>
      </div>

      <div class="form-row">
        <UIFormItem path="thumbnail" :label="$t({ en: 'Thumbnail', zh: '缩略图' })">
          <ThumbnailUploader v-model:thumbnail="form.value.thumbnail" class="thumbnail-uploader" />
        </UIFormItem>

        <UIFormItem path="references" :label="$t({ en: 'Reference projects', zh: '参考项目' })">
          <ProjectReferencesInput v-model:references="form.value.references" class="project-references" />
        </UIFormItem>
      </div>

      <UIFormItem class="full-width" path="prompt" :label="$t({ en: 'Prompt for Copilot', zh: 'Copilot 提示词' })">
        <UITextInput
          v-model:value="form.value.prompt"
          type="textarea"
          :rows="5"
          :placeholder="
            $t({
              en: 'Enter instructions for Copilot to guide users through this course',
              zh: '请输入 Copilot 引导用户完成课程的指令'
            })
          "
        />
      </UIFormItem>

      <footer class="footer">
        <UIButton type="boring" @click="emit('cancelled')">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton type="primary" html-type="submit" :loading="handleSubmit.isLoading.value">
          {{ isEditMode ? $t({ en: 'Update', zh: '更新' }) : $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<style lang="scss" scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 24px;

  > :deep(.ui-form-item) {
    margin-top: 0 !important;
  }
}

.thumbnail-uploader {
  width: 100%;
  height: 200px;
}

.project-references {
  width: 100%;
  height: 200px;
}

.full-width {
  margin-bottom: 24px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--ui-color-divider-subtle);
}
</style>
