<script lang="ts" setup>
/**
 * Create a course series, or edit its title, thumbnail and description. A new series starts empty: courses are created
 * in it from its page. Its order is decided by where it is dragged among the series.
 */
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import type { CourseKind } from '@/apis/course'
import {
  addCourseSeries,
  courseSeriesDescriptionMaxLength,
  courseSeriesTitleMaxLength,
  type CourseSeries
} from '@/apis/course-series'
import { useUpdateCourseSeries } from '@/stores/course-series'
import {
  UIButton,
  UIDrawer,
  UIForm,
  UIFormItem,
  UIRadio,
  UIRadioGroup,
  UITextInput,
  useForm,
  useMessage
} from '@/components/ui'
import ThumbnailUploader from './ThumbnailUploader.vue'
import { useDrawerFormChanges } from './drawer-form'
import { courseKindNames } from './kind'

const props = defineProps<{
  visible: boolean
  /** The series to edit, or null to create one. */
  courseSeries: CourseSeries | null
  /** The kind first chosen for a new series. */
  kind: CourseKind
  /** The `order` for a new series. */
  order: number
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [courseSeries: CourseSeries]
}>()

const i18n = useI18n()
const m = useMessage()
const updateCourseSeries = useUpdateCourseSeries()

const isEditMode = computed(() => props.courseSeries != null)

const form = useForm({
  kind: [props.courseSeries?.kind ?? props.kind],
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
  ]
})

const { confirmDiscard } = useDrawerFormChanges(() => form.value)

const handleClose = useMessageHandle(async () => {
  // A save under way goes on after the drawer closes, and the page would not take in what it saved.
  if (handleSubmit.isLoading.value) return
  await confirmDiscard()
  emit('cancelled')
}).fn

const handleSubmit = useMessageHandle(
  async () => {
    const { title, thumbnail, description } = form.value
    if (props.courseSeries != null) {
      const updated = await m.withLoading(
        updateCourseSeries(props.courseSeries.id, { title, thumbnail, description }),
        i18n.t({ en: 'Updating course series', zh: '更新课程系列中' })
      )
      m.success(i18n.t({ en: 'Course series updated', zh: '课程系列已更新' }))
      emit('resolved', updated)
      return
    }
    const created = await m.withLoading(
      addCourseSeries({ kind: form.value.kind, title, thumbnail, description, order: props.order, courseIDs: [] }),
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
    :radar="{ name: 'course-series-drawer', desc: 'Drawer for creating or editing a course series' }"
    :visible="visible"
    :title="
      isEditMode
        ? $t({ en: 'Edit course series', zh: '编辑课程系列' })
        : $t({ en: 'Create course series', zh: '新建课程系列' })
    "
    @update:visible="handleClose"
  >
    <UIForm :form="form" @submit="submitIfIdle">
      <UIFormItem class="mt-0" path="kind" :label="$t({ en: 'Kind', zh: '类型' })">
        <UIRadioGroup
          v-if="!isEditMode"
          v-model:value="form.value.kind"
          v-radar="{ name: 'kind-radio-group', desc: 'Choose the kind of courses the series holds' }"
        >
          <UIRadio value="guided">{{ $t(courseKindNames.guided) }}</UIRadio>
          <UIRadio value="playground">{{ $t(courseKindNames.playground) }}</UIRadio>
        </UIRadioGroup>
        <!-- A series holds courses of one kind, which it keeps. -->
        <span v-else class="text-grey-800">{{ $t(courseKindNames[form.value.kind]) }}</span>
      </UIFormItem>

      <UIFormItem path="title" :label="$t({ en: 'Title', zh: '标题' })">
        <UITextInput
          v-model:value="form.value.title"
          v-radar="{ name: 'title-input', desc: 'Input for the course series title' }"
          :placeholder="$t({ en: 'Enter course series title', zh: '请输入课程系列标题' })"
        />
      </UIFormItem>

      <UIFormItem path="thumbnail" :label="$t({ en: 'Thumbnail', zh: '缩略图' })">
        <ThumbnailUploader v-model:thumbnail="form.value.thumbnail" class="h-50 w-full" />
      </UIFormItem>

      <UIFormItem path="description" :label="$t({ en: 'Description', zh: '描述' })">
        <UITextInput
          v-model:value="form.value.description"
          v-radar="{ name: 'description-input', desc: 'Input for the course series description' }"
          type="textarea"
          :rows="4"
          :placeholder="$t({ en: 'Enter course series description', zh: '请输入课程系列描述' })"
        />
      </UIFormItem>
    </UIForm>

    <template #footer>
      <UIButton type="neutral" :disabled="handleSubmit.isLoading.value" @click="handleClose">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'submit-button', desc: 'Click to save the course series' }"
        type="primary"
        :loading="handleSubmit.isLoading.value"
        @click="submit"
      >
        {{ isEditMode ? $t({ en: 'Save', zh: '保存' }) : $t({ en: 'Create', zh: '创建' }) }}
      </UIButton>
    </template>
  </UIDrawer>
</template>
