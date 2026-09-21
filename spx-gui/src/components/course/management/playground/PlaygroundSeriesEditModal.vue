<script lang="ts" setup>
/**
 * Create a Playground Course series, or edit one's details. Which courses the series holds is not edited here:
 * a Playground Course is written in the context of its series, so courses are created and removed from inside
 * the series itself (`PlaygroundManagementModal`), and this form only covers what the series is.
 *
 * Props:
 * - `visible`: whether the modal is shown; set by `UIModalProvider`.
 * - `courseSeries`: the series to edit, or null to create one.
 *
 * Emits:
 * - `cancelled`: the author closed the modal.
 * - `resolved`: payload is the created or updated series, so the caller can show it without refetching.
 *
 * Used by: components/course/management/playground/PlaygroundManagementModal.vue (through `useModal`)
 */
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import {
  addCourseSeries,
  courseSeriesDescriptionMaxLength,
  courseSeriesTitleMaxLength,
  updateCourseSeries,
  type CourseSeries
} from '@/apis/course-series'
import {
  UIButton,
  UIForm,
  UIFormItem,
  UIFormModal,
  UINumberInput,
  UITextInput,
  useForm,
  useMessage
} from '@/components/ui'
import ThumbnailUploader from '../ThumbnailUploader.vue'

const props = defineProps<{
  visible: boolean
  courseSeries: CourseSeries | null
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [courseSeries: CourseSeries]
}>()

const i18n = useI18n()
const m = useMessage()

const isEditMode = computed(() => props.courseSeries !== null)
const modalTitle = computed(() =>
  isEditMode.value
    ? i18n.t({ en: 'Edit course series', zh: '编辑课程系列' })
    : i18n.t({ en: 'Create course series', zh: '创建课程系列' })
)

const form = useForm({
  title: [
    props.courseSeries?.title ?? '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please enter series title', zh: '请输入系列标题' })
      if (v.length > courseSeriesTitleMaxLength)
        return i18n.t({
          en: `Title too long (max ${courseSeriesTitleMaxLength} chars)`,
          zh: `标题过长（最多 ${courseSeriesTitleMaxLength} 字符）`
        })
      return null
    }
  ],
  thumbnail: [
    props.courseSeries?.thumbnail ?? '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please upload a thumbnail', zh: '请上传缩略图' })
      return null
    }
  ],
  description: [
    props.courseSeries?.description ?? '',
    (v: string) => {
      if (v.length > courseSeriesDescriptionMaxLength)
        return i18n.t({
          en: `Description too long (max ${courseSeriesDescriptionMaxLength} chars)`,
          zh: `描述过长（最多 ${courseSeriesDescriptionMaxLength} 字符）`
        })
      return null
    }
  ],
  order: [props.courseSeries?.order ?? 1]
})

/**
 * Create the series with no courses yet, or update the one being edited, keeping its courses as they are.
 *
 * @returns A `useMessageHandle` wrapper; `fn()` performs the write and emits `resolved`.
 *
 * Called by: components/course/management/playground/PlaygroundSeriesEditModal.vue#template (form submit)
 */
const handleSubmit = useMessageHandle(
  async () => {
    const { title, thumbnail, description, order } = form.value

    if (props.courseSeries != null) {
      const updated = await m.withLoading(
        updateCourseSeries(props.courseSeries.id, {
          title,
          thumbnail,
          description,
          order,
          // Membership is managed from inside the series; keep whatever it holds now.
          courseIDs: props.courseSeries.courseIDs
        }),
        i18n.t({ en: 'Updating course series', zh: '更新课程系列中' })
      )
      m.success(i18n.t({ en: 'Course series updated', zh: '课程系列已更新' }))
      emit('resolved', updated)
      return
    }

    const created = await m.withLoading(
      addCourseSeries({ kind: 'playground', title, thumbnail, description, order, courseIDs: [] }),
      i18n.t({ en: 'Creating course series', zh: '创建课程系列中' })
    )
    m.success(i18n.t({ en: 'Course series created', zh: '课程系列已创建' }))
    emit('resolved', created)
  },
  {
    en: isEditMode.value ? 'Failed to update course series' : 'Failed to create course series',
    zh: isEditMode.value ? '更新课程系列失败' : '创建课程系列失败'
  }
)
</script>

<template>
  <UIFormModal
    :radar="{ name: 'playground-series-edit-modal', desc: 'Give the course series a title, thumbnail and order' }"
    :visible="visible"
    :title="modalTitle"
    size="large"
    :mask-closable="false"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" @submit="handleSubmit.fn">
      <div class="mb-6 grid grid-cols-2 gap-8">
        <div class="flex flex-col">
          <UIFormItem class="mt-0" path="title" :label="$t({ en: 'Title', zh: '标题' })">
            <UITextInput
              v-model:value="form.value.title"
              v-radar="{ name: 'title-input', desc: 'Input for the series title' }"
              :placeholder="$t({ en: 'Enter series title', zh: '请输入系列标题' })"
            />
          </UIFormItem>

          <UIFormItem path="description" :label="$t({ en: 'Description', zh: '描述' })">
            <UITextInput
              v-model:value="form.value.description"
              v-radar="{ name: 'description-input', desc: 'Input for the series description' }"
              type="textarea"
              :rows="4"
              :placeholder="$t({ en: 'What this series teaches', zh: '这个系列教什么' })"
            />
          </UIFormItem>

          <UIFormItem path="order" :label="$t({ en: 'Sort order', zh: '排序优先级' })">
            <UINumberInput
              v-model:value="form.value.order"
              v-radar="{ name: 'order-input', desc: 'Input for the series sort order' }"
            />
          </UIFormItem>
        </div>

        <UIFormItem class="mt-0" path="thumbnail" :label="$t({ en: 'Thumbnail', zh: '缩略图' })">
          <ThumbnailUploader v-model:thumbnail="form.value.thumbnail" class="h-50 w-full" />
        </UIFormItem>
      </div>

      <footer class="mt-5 flex justify-end gap-3 border-t border-dividing-line-2 pt-5">
        <UIButton type="neutral" @click="emit('cancelled')">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'confirm-button', desc: 'Click to save the course series' }"
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
