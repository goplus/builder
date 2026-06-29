<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import saveAs from 'file-saver'
import { useI18n } from '@/utils/i18n'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { selectFile } from '@/utils/file'
import { getApiStringLength } from '@/utils/utils'
import {
  addCourseSeries,
  courseSeriesDescriptionMaxLength,
  courseSeriesTitleMaxLength,
  updateCourseSeries,
  type CourseSeries,
  type AddUpdateCourseSeriesParams
} from '@/apis/course-series'
import { listSignedInUserCourses, type Course } from '@/apis/course'
import { useSignedInUser } from '@/stores/user'
import {
  exportCourseSeriesFile,
  inspectCourseSeriesFileImport,
  importCourseSeriesFile,
  importCourseSeriesFileAsNew
} from './course-series-file'
import {
  UIFormModal,
  UIForm,
  UIFormItem,
  UITextInput,
  UINumberInput,
  UIButton,
  useMessage,
  useForm,
  useConfirmDialog
} from '@/components/ui'
import CourseSelector from './CourseSelector.vue'
import SelectedCoursesList from './SelectedCoursesList.vue'
import ThumbnailUploader from './ThumbnailUploader.vue'

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
const confirm = useConfirmDialog()
const signedInUser = useSignedInUser()

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
      if (getApiStringLength(v) > courseSeriesTitleMaxLength)
        return i18n.t({
          en: `Title too long (max ${courseSeriesTitleMaxLength} chars)`,
          zh: `标题过长（最多 ${courseSeriesTitleMaxLength} 字符）`
        })
      return null
    }
  ],
  thumbnail: [
    '',
    (v: string) => {
      if (v === '') return i18n.t({ en: 'Please upload a thumbnail', zh: '请上传缩略图' })
      return null
    }
  ],
  description: [
    '',
    (v: string) => {
      if (getApiStringLength(v) > courseSeriesDescriptionMaxLength)
        return i18n.t({
          en: `Description too long (max ${courseSeriesDescriptionMaxLength} chars)`,
          zh: `描述过长（最多 ${courseSeriesDescriptionMaxLength} 字符）`
        })
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
      const result = await listSignedInUserCourses({
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
        form.value.thumbnail = props.courseSeries.thumbnail
        form.value.description = props.courseSeries.description
        form.value.order = props.courseSeries.order
        form.value.courseIDs = [...props.courseSeries.courseIDs]
      } else {
        form.value.title = ''
        form.value.thumbnail = ''
        form.value.description = ''
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
      thumbnail: form.value.thumbnail,
      description: form.value.description,
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

const handleImport = useMessageHandle(
  async () => {
    const username = signedInUser.value?.username
    if (username == null) {
      throw new DefaultException({ en: 'Please sign in first', zh: '请先登录' })
    }

    const courseSeries = props.courseSeries
    const file = await selectFile({ accept: ['xbcs.zip'] })
    const inspection = await m.withLoading(
      inspectCourseSeriesFileImport(courseSeries, file, username),
      i18n.t({ en: 'Inspecting course series file', zh: '检查课程系列文件中' })
    )

    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Import course series file', zh: '导入课程系列文件' }),
      content: getImportConfirmContent(courseSeries, inspection.deletedCourses, inspection.overwrittenProjects),
      confirmText: i18n.t({ en: 'Import', zh: '导入' })
    })

    await m.withLoading(
      courseSeries != null
        ? importCourseSeriesFile(courseSeries, file, username)
        : importCourseSeriesFileAsNew(file, username),
      i18n.t({ en: 'Importing course series file', zh: '导入课程系列文件中' })
    )
    m.success(i18n.t({ en: 'Course series imported successfully', zh: '课程系列导入成功' }))
    emit('resolved')
  },
  {
    en: 'Failed to import course series file',
    zh: '导入课程系列文件失败'
  }
)

const handleExport = useMessageHandle(
  async () => {
    if (props.courseSeries == null) throw new Error('Course series expected')
    const exported = await m.withLoading(
      exportCourseSeriesFile(props.courseSeries),
      i18n.t({ en: 'Exporting course series file', zh: '导出课程系列文件中' })
    )
    saveAs(exported, exported.name)
  },
  {
    en: 'Failed to export course series file',
    zh: '导出课程系列文件失败'
  }
)

function getImportConfirmContent(
  courseSeries: CourseSeries | null,
  deletedCourses: string[],
  overwrittenProjects: string[]
) {
  const deletedCourseText = formatNameList(deletedCourses)
  const overwrittenProjectText = formatNameList(overwrittenProjects)
  if (courseSeries != null) {
    return i18n.t({
      en: `Courses currently in "${courseSeries.title}" will be deleted and rebuilt from the imported file. Deleted courses: ${deletedCourseText}. Overwritten projects: ${overwrittenProjectText}. This operation cannot be undone. Continue?`,
      zh: `当前课程系列“${courseSeries.title}”中的旧课程会被删除，并根据导入文件重建。会删除的课程：${deletedCourseText}。会覆盖并发布的项目：${overwrittenProjectText}。此操作不可撤销，确定继续吗？`
    })
  }
  return i18n.t({
    en: `A new course series will be created from the imported file. Overwritten projects: ${overwrittenProjectText}. Continue?`,
    zh: `将根据导入文件创建一个新的课程系列。会覆盖并发布的项目：${overwrittenProjectText}。确定继续吗？`
  })
}

function formatNameList(names: string[]) {
  if (names.length === 0) return i18n.t({ en: 'None', zh: '无' })
  const visibleNames = names.slice(0, 8).map((name) => `"${name}"`)
  if (names.length <= visibleNames.length) {
    return i18n.t({ en: visibleNames.join(', '), zh: visibleNames.join('、') })
  }
  return i18n.t({
    en: `${visibleNames.join(', ')} and ${names.length - visibleNames.length} more`,
    zh: `${visibleNames.join('、')} 等 ${names.length} 个`
  })
}
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
      <div class="mb-6 grid grid-cols-[350px_1fr] gap-6">
        <UIFormItem class="thumbnail-wrapper mt-0" path="thumbnail" :label="$t({ en: 'Thumbnail', zh: '缩略图' })">
          <ThumbnailUploader
            class="h-65"
            :thumbnail="form.value.thumbnail"
            @update:thumbnail="(v) => (form.value.thumbnail = v)"
          />
        </UIFormItem>

        <div>
          <UIFormItem class="mt-0" path="title" :label="$t({ en: 'Title', zh: '标题' })">
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

          <UIFormItem class="mt-0" path="description" :label="$t({ en: 'Description', zh: '描述' })">
            <UITextInput
              v-model:value="form.value.description"
              type="textarea"
              :rows="3"
              :placeholder="
                $t({
                  en: 'Enter course series description',
                  zh: '请输入课程系列描述'
                })
              "
            />
          </UIFormItem>

          <UIFormItem class="mt-0" path="order" :label="$t({ en: 'Sort order', zh: '排序优先级' })">
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
      </div>

      <UIFormItem v-show="false" path="courseIDs">
        <span />
      </UIFormItem>

      <div class="mb-6">
        <label class="mb-3 block text-grey-800">
          {{ $t({ en: 'Courses', zh: '课程' }) }}
        </label>
        <div class="grid h-100 grid-cols-2 gap-6">
          <div class="flex flex-col overflow-hidden rounded-md border border-dividing-line-2">
            <!-- FIXME: `bg-grey-50` is not taking effect -->
            <label class="border-b border-dividing-line-2 bg-grey-50 px-4 py-3 text-grey-800">
              {{ $t({ en: 'Available courses', zh: '可选课程' }) }}
            </label>
            <div class="flex-1 min-h-0">
              <CourseSelector
                :courses="allCourses"
                :selected-ids="form.value.courseIDs"
                :loading="coursesLoading"
                @select="(id) => (form.value.courseIDs = [...form.value.courseIDs, id])"
              />
            </div>
          </div>
          <div class="flex flex-col overflow-hidden rounded-md border border-dividing-line-2">
            <!-- FIXME: `bg-grey-50` is not taking effect -->
            <label class="border-b border-dividing-line-2 bg-grey-50 px-4 py-3 text-grey-800">
              {{ $t({ en: 'Selected courses', zh: '已选课程' }) }}
            </label>
            <div class="flex-1 min-h-0">
              <SelectedCoursesList
                :course-ids="form.value.courseIDs"
                :all-courses="allCourses"
                @update:course-ids="(ids) => (form.value.courseIDs = ids)"
              />
            </div>
          </div>
        </div>
        <div v-if="form.validated.courseIDs?.hasError" class="mt-2 text-danger-500">
          {{ form.validated.courseIDs.error }}
        </div>
      </div>

      <footer class="mt-5 flex justify-end gap-3 border-t border-dividing-line-2 pt-5">
        <UIButton v-if="isEditMode" type="neutral" :loading="handleExport.isLoading.value" @click="handleExport.fn">
          {{ $t({ en: 'Export to file', zh: '导出到文件' }) }}
        </UIButton>
        <UIButton type="neutral" :loading="handleImport.isLoading.value" @click="handleImport.fn">
          {{ $t({ en: 'Import from file...', zh: '从文件导入...' }) }}
        </UIButton>
        <UIButton type="neutral" @click="emit('cancelled')">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton type="primary" html-type="submit" :loading="handleSubmit.isLoading.value">
          {{ isEditMode ? $t({ en: 'Update', zh: '更新' }) : $t({ en: 'Create', zh: '创建' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>
