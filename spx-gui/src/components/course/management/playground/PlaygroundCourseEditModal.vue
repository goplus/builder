<script lang="ts" setup>
/**
 * Create a Playground Course, or edit the metadata of one. Playground Courses keep everything else (the program,
 * the resources, the embedded project) inside their content, which the Course Editor edits; here the author only
 * gives the course a title and a thumbnail, both of which the Course API requires.
 *
 * Creating one also gives it something to start from: a default SPX project and a program that already runs (see
 * `components/course-editor/starter`). A course created empty could not be opened, previewed or learned.
 *
 * Props:
 * - `visible`: whether the modal is shown; set by `UIModalProvider`.
 * - `course`: the course to edit, or null to create one.
 *
 * Emits:
 * - `cancelled`: the author closed the modal.
 * - `resolved`: payload is the created or updated course, so the caller can add it to a series or refresh.
 *
 * Used by: components/course/management/playground/PlaygroundManagementModal.vue (through `useModal`)
 */
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import {
  addCourse,
  courseTitleMaxLength,
  updateCourse,
  type PlaygroundCourse,
  type AddCourseParams
} from '@/apis/course'
import { saveFiles } from '@/models/common/cloud'
import { createStarterCourseFiles } from '@/components/course-editor/starter'
import { createDefaultProject } from '@/components/project/default-project'
import { UIButton, UIForm, UIFormItem, UIFormModal, UITextInput, useForm, useMessage } from '@/components/ui'
import ThumbnailUploader from '../ThumbnailUploader.vue'

const props = defineProps<{
  visible: boolean
  course: PlaygroundCourse | null
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [course: PlaygroundCourse]
}>()

const i18n = useI18n()
const m = useMessage()

const isEditMode = computed(() => props.course !== null)
const modalTitle = computed(() =>
  isEditMode.value ? i18n.t({ en: 'Edit course', zh: '编辑课程' }) : i18n.t({ en: 'Create course', zh: '创建课程' })
)

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

/**
 * The records a new course starts with: a default SPX project, the configuration pointing at it, and a starter
 * program. The project is built only to export its records and disposed right after.
 *
 * @returns The course's files, ready to upload.
 *
 * Called by: components/course/management/playground/PlaygroundCourseEditModal.vue#handleSubmit
 */
async function buildStarterFiles() {
  const project = await createDefaultProject('', '', [])
  try {
    return createStarterCourseFiles(project.exportFiles())
  } finally {
    project.dispose()
  }
}

/**
 * Create the course (uploading its starter content first) or update the one being edited, then resolve with it.
 *
 * @returns A `useMessageHandle` wrapper; `fn()` performs the write and emits `resolved`.
 *
 * Called by: components/course/management/playground/PlaygroundCourseEditModal.vue#template (form submit)
 */
const handleSubmit = useMessageHandle(
  async () => {
    const { title, thumbnail } = form.value

    if (props.course != null) {
      const updated = await m.withLoading(
        updateCourse(props.course.id, { title, thumbnail }),
        i18n.t({ en: 'Updating course', zh: '更新课程中' })
      )
      m.success(i18n.t({ en: 'Course updated', zh: '课程已更新' }))
      emit('resolved', updated as PlaygroundCourse)
      return
    }

    const created = await m.withLoading(
      (async () => {
        const { fileCollection } = await saveFiles(await buildStarterFiles())
        const params: AddCourseParams = { kind: 'playground', title, thumbnail, content: fileCollection }
        return addCourse(params)
      })(),
      i18n.t({ en: 'Creating course', zh: '创建课程中' })
    )
    m.success(i18n.t({ en: 'Course created', zh: '课程已创建' }))
    emit('resolved', created as PlaygroundCourse)
  },
  {
    en: isEditMode.value ? 'Failed to update course' : 'Failed to create course',
    zh: isEditMode.value ? '更新课程失败' : '创建课程失败'
  }
)
</script>

<template>
  <UIFormModal
    :radar="{ name: 'playground-course-edit-modal', desc: 'Give the course a title and a thumbnail' }"
    :visible="visible"
    :title="modalTitle"
    :mask-closable="false"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" @submit="handleSubmit.fn">
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

      <!-- Says where the rest of a course is edited, so the short form does not read like the whole thing. -->
      <p v-if="!isEditMode" class="m-0 text-sm text-grey-700">
        {{
          $t({
            en: 'The course starts with a default project and a short program; you write the lesson in the Course Editor.',
            zh: '新课程会带上一个默认工程和一段起始程序，课程内容在课程编辑器里编写。'
          })
        }}
      </p>

      <footer class="mt-5 flex justify-end gap-3 border-t border-dividing-line-2 pt-5">
        <UIButton type="neutral" @click="emit('cancelled')">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'confirm-button', desc: 'Click to save the course' }"
          type="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
          {{ isEditMode ? $t({ en: 'Update', zh: '更新' }) : $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>
