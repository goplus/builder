<script lang="ts" setup>
/**
 * Create a Guided Course in a series, or edit one. A Guided Course has no editor of its own: this form is all of it.
 */
import { computed, onUnmounted } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { coursePromptMaxLength, courseTitleMaxLength, type Course, type GuidedCourse } from '@/apis/course'
import { useUpdateCourse } from '@/stores/course'
import { useUpdateCourseSeries } from '@/stores/course-series'
import { UIButton, UIDrawer, UIForm, UIFormItem, UITextInput, useForm, useMessage } from '@/components/ui'
import ThumbnailUploader from './ThumbnailUploader.vue'
import { CourseCreation } from './course-creation'
import { useDrawerFormChanges } from './drawer-form'

const props = defineProps<{
  visible: boolean
  /** The course to edit, or null to create one. */
  course: GuidedCourse | null
  /** The series the course is in, or is created in. */
  courseSeriesID: string
  /** The unit a new course is created in, in a series divided into units; the last one if not given. */
  unitID?: string | null
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [course: Course]
}>()

const i18n = useI18n()
const m = useMessage()
const updateCourse = useUpdateCourse()

const isEditMode = computed(() => props.course != null)

const form = useForm({
  title: [
    props.course?.title ?? '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please enter course title', zh: '请输入课程标题' })
      if (v.length > courseTitleMaxLength)
        return i18n.t({
          en: `Title too long (max ${courseTitleMaxLength} chars)`,
          zh: `标题过长（最多 ${courseTitleMaxLength} 字符）`
        })
      return null
    }
  ],
  entrypoint: [
    props.course?.content.entrypoint ?? '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please enter entrypoint', zh: '请输入起始地址' })
      if (!/^\/.*$/.test(v)) return i18n.t({ en: 'URL must start with /', zh: 'URL 必须以 / 开头' })
      return null
    }
  ],
  thumbnail: [
    props.course?.thumbnail ?? '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please upload a thumbnail', zh: '请上传缩略图' })
      return null
    }
  ],
  prompt: [
    props.course?.content.prompt ?? '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please enter Copilot prompt', zh: '请输入 Copilot 提示词' })
      if (v.length > coursePromptMaxLength)
        return i18n.t({
          en: `Copilot prompt too long (max ${coursePromptMaxLength} chars)`,
          zh: `Copilot 提示词过长（最多 ${coursePromptMaxLength} 字符）`
        })
      return null
    }
  ]
})

const { confirmDiscard } = useDrawerFormChanges(() => form.value)

// Outlives a failed submit, so submitting again finishes what is left instead of creating a second course.
const creation = new CourseCreation(props.courseSeriesID, useUpdateCourseSeries(), props.unitID ?? null)
// A course created but not added to the series would be in no series, so it does not outlive the drawer.
onUnmounted(() => creation.abandon())

const handleClose = useMessageHandle(async () => {
  // Closing unmounts the drawer, which abandons the creation; a creation still under way would not be cleaned up.
  if (handleSubmit.isLoading.value) return
  await confirmDiscard()
  emit('cancelled')
}).fn

const handleSubmit = useMessageHandle(
  async () => {
    const { title, thumbnail, entrypoint, prompt } = form.value
    const content = { entrypoint, prompt }
    if (props.course != null) {
      const updated = await m.withLoading(
        updateCourse(props.course.id, { title, thumbnail, content }),
        i18n.t({ en: 'Updating course', zh: '更新课程中' })
      )
      m.success(i18n.t({ en: 'Course updated', zh: '课程已更新' }))
      emit('resolved', updated)
      return
    }
    const { course } = await m.withLoading(
      creation.run(async () => ({ kind: 'guided', title, thumbnail, content })),
      i18n.t({ en: 'Creating course', zh: '创建课程中' })
    )
    m.success(i18n.t({ en: 'Course created', zh: '课程已创建' }))
    emit('resolved', course)
  },
  {
    en: isEditMode.value ? 'Failed to update course' : 'Failed to create course',
    zh: isEditMode.value ? '更新课程失败' : '创建课程失败'
  }
)

/** Submit unless a submission is under way, which pressing Enter or clicking again would start a second time. */
function submitIfIdle() {
  if (!handleSubmit.isLoading.value) void handleSubmit.fn()
}

async function submit() {
  const { hasError } = await form.validate()
  if (!hasError) submitIfIdle()
}
</script>

<template>
  <UIDrawer
    :radar="{ name: 'guided-course-drawer', desc: 'Drawer for creating or editing a Guided Course' }"
    :visible="visible"
    size="large"
    :title="isEditMode ? $t({ en: 'Edit course', zh: '编辑课程' }) : $t({ en: 'Create course', zh: '新建课程' })"
    @update:visible="handleClose"
  >
    <UIForm :form="form" @submit="submitIfIdle">
      <UIFormItem class="mt-0" path="title" :label="$t({ en: 'Title', zh: '标题' })">
        <UITextInput
          v-model:value="form.value.title"
          v-radar="{ name: 'title-input', desc: 'Input for the course title' }"
          :placeholder="$t({ en: 'Enter course title', zh: '请输入课程标题' })"
        />
      </UIFormItem>

      <UIFormItem path="entrypoint" :label="$t({ en: 'Entrypoint', zh: '起始地址' })">
        <UITextInput
          v-model:value="form.value.entrypoint"
          v-radar="{ name: 'entrypoint-input', desc: 'Input for the URL the course starts at' }"
          :placeholder="$t({ en: 'e.g., / or /editor/owner/project', zh: '例如：/ 或 /editor/owner/project' })"
        />
      </UIFormItem>

      <UIFormItem path="thumbnail" :label="$t({ en: 'Thumbnail', zh: '缩略图' })">
        <ThumbnailUploader v-model:thumbnail="form.value.thumbnail" class="h-50 w-full" />
      </UIFormItem>

      <UIFormItem path="prompt" :label="$t({ en: 'Prompt for Copilot', zh: 'Copilot 提示词' })">
        <UITextInput
          v-model:value="form.value.prompt"
          v-radar="{ name: 'prompt-input', desc: 'Input for the instructions Copilot follows in the course' }"
          type="textarea"
          :rows="12"
          :placeholder="
            $t({
              en: 'Enter instructions for Copilot to guide users through this course',
              zh: '请输入 Copilot 引导用户完成课程的指令'
            })
          "
        />
      </UIFormItem>
    </UIForm>

    <template #footer>
      <UIButton type="neutral" :disabled="handleSubmit.isLoading.value" @click="handleClose">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'submit-button', desc: 'Click to save the course' }"
        type="primary"
        :loading="handleSubmit.isLoading.value"
        @click="submit"
      >
        {{ isEditMode ? $t({ en: 'Save', zh: '保存' }) : $t({ en: 'Create', zh: '创建' }) }}
      </UIButton>
    </template>
  </UIDrawer>
</template>
