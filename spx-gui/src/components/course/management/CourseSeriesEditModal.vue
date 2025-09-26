<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import {
  addCourseSeries,
  updateCourseSeries,
  type CourseSeries,
  type AddUpdateCourseSeriesParams
} from '@/apis/course-series'
import { listCourse, type Course } from '@/apis/course'
import {
  UIFormModal,
  UIForm,
  UIFormItem,
  UITextInput,
  UINumberInput,
  UIButton,
  useMessage,
  useForm
} from '@/components/ui'
import CourseSelector from './CourseSelector.vue'
import SelectedCoursesList from './SelectedCoursesList.vue'

const props = defineProps<{
  visible: boolean
  courseSeries: CourseSeries | null
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
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
    '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please enter series title', zh: '请输入系列标题' })
      if (v.length > 200) return i18n.t({ en: 'Title too long (max 200 chars)', zh: '标题过长（最多200字符）' })
      return null
    }
  ],
  order: [1],
  courseIDs: [
    [] as string[],
    (v: string[]) => {
      if (v.length === 0) return i18n.t({ en: 'Please select at least one course', zh: '请至少选择一个课程' })
      return null
    }
  ]
})

const allCourses = ref<Course[]>([])
const coursesLoading = ref(false)

const loadCourses = useMessageHandle(
  async () => {
    coursesLoading.value = true
    try {
      // Load first 100 courses (should be enough for most cases).
      //
      // TODO: Consider implementing pagination or infinite scroll when there are more than 100 courses.
      const result = await listCourse({
        pageSize: 100,
        orderBy: 'updatedAt',
        sortOrder: 'desc'
      })
      allCourses.value = result.data
    } finally {
      coursesLoading.value = false
    }
  },
  {
    en: 'Failed to load courses',
    zh: '加载课程失败'
  }
).fn

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.courseSeries) {
        form.value.title = props.courseSeries.title
        form.value.order = props.courseSeries.order
        form.value.courseIDs = [...props.courseSeries.courseIDs]
      } else {
        form.value.title = ''
        form.value.order = 1
        form.value.courseIDs = []
      }

      loadCourses()
    }
  },
  { immediate: true }
)

const handleSubmit = useMessageHandle(
  async () => {
    const formData: AddUpdateCourseSeriesParams = {
      title: form.value.title,
      courseIDs: form.value.courseIDs,
      order: form.value.order
    }

    if (isEditMode.value && props.courseSeries) {
      await m.withLoading(
        updateCourseSeries(props.courseSeries.id, formData),
        i18n.t({ en: 'Updating course series', zh: '更新课程系列中' })
      )
      m.success(i18n.t({ en: 'Course series updated successfully', zh: '课程系列更新成功' }))
    } else {
      await m.withLoading(addCourseSeries(formData), i18n.t({ en: 'Creating course series', zh: '创建课程系列中' }))
      m.success(i18n.t({ en: 'Course series created successfully', zh: '课程系列创建成功' }))
    }

    emit('resolved')
  },
  {
    en: isEditMode.value ? 'Failed to update course series' : 'Failed to create course series',
    zh: isEditMode.value ? '更新课程系列失败' : '创建课程系列失败'
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
                en: 'Enter course series title',
                zh: '请输入课程系列标题'
              })
            "
          />
        </UIFormItem>

        <UIFormItem path="order" :label="$t({ en: 'Sort order', zh: '排序优先级' })">
          <UINumberInput
            v-model:value="form.value.order"
            :placeholder="
              $t({
                en: 'Enter sort order (1, 2, 3...)',
                zh: '请输入排序优先级（1, 2, 3...）'
              })
            "
          />
        </UIFormItem>
      </div>

      <UIFormItem v-show="false" path="courseIDs">
        <span />
      </UIFormItem>

      <div class="courses-section">
        <label class="section-label">
          {{ $t({ en: 'Courses', zh: '课程' }) }}
        </label>
        <div class="course-selection">
          <div class="selection-panel">
            <label class="course-label">{{ $t({ en: 'Available courses', zh: '可选课程' }) }}</label>
            <CourseSelector
              :courses="allCourses"
              :selected-ids="form.value.courseIDs"
              :loading="coursesLoading"
              @select="(id) => (form.value.courseIDs = [...form.value.courseIDs, id])"
            />
          </div>
          <div class="selection-panel">
            <label class="course-label">{{ $t({ en: 'Selected courses', zh: '已选课程' }) }}</label>
            <SelectedCoursesList
              :course-ids="form.value.courseIDs"
              :all-courses="allCourses"
              @update:course-ids="(ids) => (form.value.courseIDs = ids)"
            />
          </div>
        </div>
        <div v-if="form.validated.courseIDs?.hasError" class="error-message">
          {{ form.validated.courseIDs.error }}
        </div>
      </div>

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
  grid-template-columns: 1fr 200px;
  gap: 24px;
  margin-bottom: 24px;

  > :deep(.ui-form-item) {
    margin-top: 0 !important;
  }
}

.courses-section {
  margin-bottom: 24px;
}

.section-label {
  font-weight: 500;
  color: var(--ui-color-grey-800);
  margin-bottom: 12px;
}

.error-message {
  margin-top: 8px;
  color: var(--ui-color-danger-500);
}

.course-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  height: 400px;
}

.selection-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ui-color-divider-subtle);
  border-radius: var(--ui-border-radius-2);
  overflow: hidden;

  .course-label {
    padding: 12px 16px;
    color: var(--ui-color-grey-800);
    background: var(--ui-color-grey-50);
    border-bottom: 1px solid var(--ui-color-divider-subtle);
  }

  > div {
    flex: 1;
    min-height: 0;
  }
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
