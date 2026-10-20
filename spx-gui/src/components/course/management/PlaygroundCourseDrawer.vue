<script lang="ts" setup>
/**
 * Create a Playground Course in a series, or edit its title and thumbnail; what it teaches is written in the Course
 * Editor, which the drawer opens. A new course starts from starter content.
 */
import { computed, onUnmounted } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { courseTitleMaxLength, type Course, type PlaygroundCourse } from '@/apis/course'
import { saveFiles } from '@/models/common/cloud'
import { useUpdateCourse } from '@/stores/course'
import { useUpdateCourseSeries } from '@/stores/course-series'
import { createStarterCourseFiles } from '@/components/course-editor/starter'
import { createDefaultProject } from '@/components/project/default-project'
import { UIButton, UIDrawer, UIForm, UIFormItem, UIIcon, UITextInput, useForm, useMessage } from '@/components/ui'
import ThumbnailUploader from './ThumbnailUploader.vue'
import { CourseCreation } from './course-creation'
import { useDrawerFormChanges } from './drawer-form'

const props = defineProps<{
  visible: boolean
  /** The course to edit, or null to create one. */
  course: PlaygroundCourse | null
  /** The series the course is in, or is created in. */
  courseSeriesID: string
}>()

const emit = defineEmits<{
  cancelled: []
  /** `openEditor` asks for the course to be opened in the Course Editor, as a new course is. */
  resolved: [result: { course: Course; openEditor: boolean }]
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
  thumbnail: [
    props.course?.thumbnail ?? '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please upload a thumbnail', zh: '请上传缩略图' })
      return null
    }
  ]
})

const { confirmDiscard } = useDrawerFormChanges(() => form.value)

// Outlives a failed submit, so submitting again finishes what is left instead of creating a second course.
const creation = new CourseCreation(props.courseSeriesID, useUpdateCourseSeries())
// A course created but not added to the series would be in no series, so it does not outlive the drawer.
onUnmounted(() => creation.abandon())

async function buildStarterContent() {
  const project = await createDefaultProject('', '', [])
  try {
    const { fileCollection } = await saveFiles(createStarterCourseFiles(project.exportFiles()))
    return fileCollection
  } finally {
    project.dispose()
  }
}

const handleClose = useMessageHandle(async () => {
  // Closing unmounts the drawer, which abandons the creation; a creation still under way would not be cleaned up.
  if (handleSubmit.isLoading.value) return
  await confirmDiscard()
  emit('cancelled')
}).fn

const handleOpenEditor = useMessageHandle(async () => {
  if (props.course == null) return
  await confirmDiscard()
  emit('resolved', { course: props.course, openEditor: true })
}).fn

const handleSubmit = useMessageHandle(
  async () => {
    const { title, thumbnail } = form.value
    if (props.course != null) {
      const updated = await m.withLoading(
        updateCourse(props.course.id, { title, thumbnail }),
        i18n.t({ en: 'Updating course', zh: '更新课程中' })
      )
      m.success(i18n.t({ en: 'Course updated', zh: '课程已更新' }))
      emit('resolved', { course: updated, openEditor: false })
      return
    }
    const { course } = await m.withLoading(
      creation.run(async () => ({ kind: 'playground', title, thumbnail, content: await buildStarterContent() })),
      i18n.t({ en: 'Creating course', zh: '创建课程中' })
    )
    m.success(i18n.t({ en: 'Course created', zh: '课程已创建' }))
    emit('resolved', { course, openEditor: true })
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
    :radar="{ name: 'playground-course-drawer', desc: 'Drawer for creating a Playground Course or editing its title' }"
    :visible="visible"
    :title="isEditMode ? $t({ en: 'Course info', zh: '课程信息' }) : $t({ en: 'Create course', zh: '新建课程' })"
    @update:visible="handleClose"
  >
    <div v-if="isEditMode" class="mb-6 flex items-center justify-between gap-4 rounded-md bg-grey-300 px-4 py-3">
      <span class="text-grey-800">
        {{ $t({ en: 'The course itself is written in the Course Editor.', zh: '课程内容在课程编辑器中编写。' }) }}
      </span>
      <UIButton
        v-radar="{ name: 'open-course-editor-button', desc: 'Click to edit the course in the Course Editor' }"
        type="secondary"
        @click="handleOpenEditor"
      >
        <template #icon><UIIcon type="edit" /></template>
        {{ $t({ en: 'Edit course', zh: '编辑课程' }) }}
      </UIButton>
    </div>

    <UIForm :form="form" @submit="submitIfIdle">
      <UIFormItem class="mt-0" path="title" :label="$t({ en: 'Title', zh: '标题' })">
        <UITextInput
          v-model:value="form.value.title"
          v-radar="{ name: 'title-input', desc: 'Input for the course title' }"
          :placeholder="$t({ en: 'Enter course title', zh: '请输入课程标题' })"
        />
      </UIFormItem>

      <UIFormItem path="thumbnail" :label="$t({ en: 'Thumbnail', zh: '缩略图' })">
        <ThumbnailUploader v-model:thumbnail="form.value.thumbnail" class="h-50 w-full" />
      </UIFormItem>
    </UIForm>

    <p v-if="!isEditMode" class="m-0 text-sm text-grey-700">
      {{
        $t({
          en: 'The course starts with a default project and a short program, and opens in the Course Editor.',
          zh: '新课程会带上一个默认工程和一段起始程序，创建后在课程编辑器中打开。'
        })
      }}
    </p>

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
