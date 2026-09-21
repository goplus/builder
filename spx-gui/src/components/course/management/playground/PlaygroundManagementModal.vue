<script lang="ts" setup>
/**
 * Manage Playground Courses, by series. A Playground Course is written in the context of a series: the Course
 * Editor addresses a course through the series it belongs to, and the learner walks a series from one course to
 * the next. So this modal opens on the author's series, and a course is created, opened and removed from inside
 * the series it belongs to, rather than from a flat list of courses.
 *
 * Props:
 * - `visible`: whether the modal is shown; set by `UIModalProvider`.
 *
 * Emits:
 * - `cancelled`: the author closed the modal.
 * - `resolved`: the modal is done because it navigated to the Course Editor.
 *
 * Used by: components/course/index.ts#usePlaygroundManagement (through `useModal`), which
 * components/navbar/NavbarProfile.vue calls from the profile menu.
 *
 * Uses: the shared course/series items and their corner menus, `PlaygroundSeriesEditModal` and
 * `PlaygroundCourseEditModal` (through `useModal`), the Course and Course Series APIs, and
 * `getCourseEditorRoute` to open a course for editing.
 */
import { computed, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { deleteCourse, listCourses, type Course, type PlaygroundCourse } from '@/apis/course'
import {
  deleteCourseSeries,
  listSignedInUserCourseSeries,
  updateCourseSeries,
  type CourseSeries
} from '@/apis/course-series'
import { getCourseEditorRoute } from '@/apps/xbuilder/router'
import {
  UIButton,
  UIIcon,
  UIPagination,
  UISearchableModal,
  useConfirmDialog,
  useMessage,
  useModal
} from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CourseItem from '../CourseItem.vue'
import CourseItemCornerMenu from '../CourseItemCornerMenu.vue'
import CourseSeriesItem from '../CourseSeriesItem.vue'
import CourseSeriesItemCornerMenu from '../CourseSeriesItemCornerMenu.vue'
import PlaygroundCourseEditModal from './PlaygroundCourseEditModal.vue'
import PlaygroundSeriesEditModal from './PlaygroundSeriesEditModal.vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const i18n = useI18n()
const m = useMessage()
const confirm = useConfirmDialog()
const router = useRouter()

const invokeSeriesEditModal = useModal(PlaygroundSeriesEditModal)
const invokeCourseEditModal = useModal(PlaygroundCourseEditModal)

const pageSize = 12

/**
 * The series whose courses are shown, or null while the series themselves are listed. This is the modal's only
 * mode switch: the two views share one shell.
 * Written by: `handleOpenSeries`, `handleBack`, `handleEditSeries` (refreshed copy), `handleCreateCourse`.
 */
const selectedSeries = shallowRef<CourseSeries | null>(null)

const seriesPage = shallowRef(1)
const seriesPageTotal = computed(() => Math.ceil((seriesQueryRet.data.value?.total ?? 0) / pageSize))

const seriesQueryRet = useQuery(
  () =>
    listSignedInUserCourseSeries({
      pageSize,
      pageIndex: seriesPage.value,
      kind: 'playground',
      orderBy: 'order',
      sortOrder: 'asc'
    }),
  { en: 'Failed to list course series', zh: '获取课程系列列表失败' }
)

const coursePage = shallowRef(1)
const coursePageTotal = computed(() => Math.ceil((coursesQueryRet.data.value?.total ?? 0) / pageSize))

// Courses are listed by series, in the order the series puts them in; the Course APIs have no filter by kind,
// and none is needed here because a series only holds courses of its own kind.
const coursesQueryRet = useQuery(
  async () => {
    const series = selectedSeries.value
    if (series == null) return { total: 0, data: [] as PlaygroundCourse[] }
    const result = await listCourses({
      courseSeriesID: series.id,
      pageSize,
      pageIndex: coursePage.value,
      orderBy: 'sequenceInCourseSeries',
      sortOrder: 'asc'
    })
    return { ...result, data: result.data.filter(isPlaygroundCourse) }
  },
  { en: 'Failed to list courses', zh: '获取课程列表失败' }
)

/**
 * Narrow a course to a Playground Course.
 * @param course - Any course from the API.
 * @returns True for Playground Courses.
 * Called by: `coursesQueryRet` (filtering the series' courses)
 */
function isPlaygroundCourse(course: Course): course is PlaygroundCourse {
  return course.kind === 'playground'
}

const handleCreateSeries = useMessageHandle(
  async () => {
    await invokeSeriesEditModal({ courseSeries: null })
    seriesQueryRet.refetch()
  },
  { en: 'Failed to create course series', zh: '创建课程系列失败' }
).fn

const handleEditSeries = useMessageHandle(
  async (courseSeries: CourseSeries) => {
    const updated = await invokeSeriesEditModal({ courseSeries })
    // Keep the open series in step with the edit, so its header and its `courseIDs` stay current.
    if (selectedSeries.value?.id === updated.id) selectedSeries.value = updated
    seriesQueryRet.refetch()
  },
  { en: 'Failed to edit course series', zh: '编辑课程系列失败' }
).fn

const handleRemoveSeries = useMessageHandle(
  async (courseSeries: CourseSeries) => {
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Remove course series', zh: '删除课程系列' }),
      content: i18n.t({
        en: `Are you sure to remove "${courseSeries.title}"? Its courses are kept.`,
        zh: `确定要删除"${courseSeries.title}"吗？其中的课程会保留。`
      })
    })
    await m.withLoading(
      deleteCourseSeries(courseSeries.id),
      i18n.t({ en: 'Removing course series', zh: '删除课程系列中' })
    )
    seriesQueryRet.refetch()
  },
  { en: 'Failed to remove course series', zh: '删除课程系列失败' }
).fn

/**
 * Show the courses of a series.
 * @param courseSeries - The series to open.
 * Called by: `PlaygroundManagementModal.vue#template` (clicking a series)
 */
function handleOpenSeries(courseSeries: CourseSeries) {
  selectedSeries.value = courseSeries
  coursePage.value = 1
}

/**
 * Go back to the list of series, refreshing it in case a series changed while it was open.
 * Called by: `PlaygroundManagementModal.vue#template` (the back button)
 */
function handleBack() {
  selectedSeries.value = null
  seriesQueryRet.refetch()
}

/**
 * Open a course in the Course Editor. The route pairs the course with the series it is being written for, which
 * is the one currently open here.
 * @param course - The course to edit.
 * @returns Promise resolving once the navigation is done; the modal closes first.
 * Called by: `PlaygroundManagementModal.vue#template` (clicking a course), `handleCreateCourse`
 */
async function openInCourseEditor(course: PlaygroundCourse) {
  const series = selectedSeries.value
  if (series == null) return
  // Close first: the modal lives above the page and would otherwise cover the editor it just opened.
  emit('resolved')
  await router.push(getCourseEditorRoute(series.id, course.id))
}

const handleCreateCourse = useMessageHandle(
  async () => {
    const series = selectedSeries.value
    if (series == null) return
    const course = await invokeCourseEditModal({ course: null })
    // A new course belongs to the series it was created in; the API keeps the order of `courseIDs`.
    const updated = await m.withLoading(
      updateCourseSeries(series.id, {
        title: series.title,
        thumbnail: series.thumbnail,
        description: series.description,
        order: series.order,
        courseIDs: [...series.courseIDs, course.id]
      }),
      i18n.t({ en: 'Adding the course to the series', zh: '把课程加入系列中' })
    )
    selectedSeries.value = updated
    await openInCourseEditor(course)
  },
  { en: 'Failed to create course', zh: '创建课程失败' }
).fn

const handleEditCourse = useMessageHandle(
  async (course: PlaygroundCourse) => {
    await invokeCourseEditModal({ course })
    coursesQueryRet.refetch()
  },
  { en: 'Failed to edit course', zh: '编辑课程失败' }
).fn

const handleRemoveCourse = useMessageHandle(
  async (course: PlaygroundCourse) => {
    const series = selectedSeries.value
    if (series == null) return
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Remove course', zh: '删除课程' }),
      content: i18n.t({
        en: `Are you sure to remove "${course.title}"? This deletes the course and everything in it.`,
        zh: `确定要删除"${course.title}"吗？课程及其中的内容都会被删除。`
      })
    })
    await m.withLoading(
      (async () => {
        // Take it out of the series first, so a failure never leaves the series pointing at a deleted course.
        const updated = await updateCourseSeries(series.id, {
          title: series.title,
          thumbnail: series.thumbnail,
          description: series.description,
          order: series.order,
          courseIDs: series.courseIDs.filter((id) => id !== course.id)
        })
        selectedSeries.value = updated
        await deleteCourse(course.id)
      })(),
      i18n.t({ en: 'Removing course', zh: '删除课程中' })
    )
    coursesQueryRet.refetch()
  },
  { en: 'Failed to remove course', zh: '删除课程失败' }
).fn
</script>

<template>
  <UISearchableModal
    style="width: 1024px"
    :visible="visible"
    :title="selectedSeries == null ? $t({ en: 'Playground Courses', zh: '目标式课程' }) : selectedSeries.title"
    @update:visible="emit('cancelled')"
  >
    <template #input>
      <!-- Series view: create a series. Course view: go back, or create a course in the open series. -->
      <UIButton
        v-if="selectedSeries == null"
        v-radar="{ name: 'create-series-button', desc: 'Click to create a course series' }"
        type="neutral"
        @click="handleCreateSeries"
      >
        <template #icon><UIIcon type="plus" /></template>
        <span>{{ $t({ en: 'Create course series', zh: '创建课程系列' }) }}</span>
      </UIButton>
      <template v-else>
        <UIButton
          v-radar="{ name: 'back-button', desc: 'Click to go back to the list of course series' }"
          type="neutral"
          @click="handleBack"
        >
          <span>{{ $t({ en: '← All series', zh: '← 全部系列' }) }}</span>
        </UIButton>
        <UIButton
          v-radar="{ name: 'create-course-button', desc: 'Click to create a course in this series' }"
          type="neutral"
          @click="handleCreateCourse"
        >
          <template #icon><UIIcon type="plus" /></template>
          <span>{{ $t({ en: 'Create course', zh: '创建课程' }) }}</span>
        </UIButton>
      </template>
    </template>

    <section class="flex flex-col px-6 pt-5 pb-6">
      <!-- Series view. -->
      <template v-if="selectedSeries == null">
        <ListResultWrapper v-slot="slotProps" :query-ret="seriesQueryRet" :height="352">
          <div class="flex flex-col">
            <div
              v-if="slotProps.data.data.length === 0"
              class="flex-1 flex flex-col items-center justify-center text-grey-700"
            >
              <p>{{ $t({ en: 'No Playground Course series yet', zh: '还没有目标式课程系列' }) }}</p>
              <p class="mt-2 text-base text-grey-600">
                {{
                  $t({
                    en: 'Create a series first; courses are written inside one',
                    zh: '先创建一个系列，课程在系列里编写'
                  })
                }}
              </p>
            </div>
            <ul v-else class="flex flex-wrap content-start gap-xl">
              <CourseSeriesItem
                v-for="courseSeries in slotProps.data.data"
                :key="courseSeries.id"
                :course-series="courseSeries"
                @click="handleOpenSeries(courseSeries)"
              >
                <CourseSeriesItemCornerMenu
                  :course-series="courseSeries"
                  @edit="handleEditSeries(courseSeries)"
                  @remove="handleRemoveSeries(courseSeries)"
                />
              </CourseSeriesItem>
            </ul>
          </div>
        </ListResultWrapper>
        <UIPagination
          v-show="seriesPageTotal > 1"
          v-model:current="seriesPage"
          class="mt-8 mb-4 justify-center"
          :total="seriesPageTotal"
        />
      </template>

      <!-- Course view: the courses of the open series, in the order learners take them. -->
      <template v-else>
        <ListResultWrapper v-slot="slotProps" :query-ret="coursesQueryRet" :height="352">
          <div class="flex flex-col">
            <div
              v-if="slotProps.data.data.length === 0"
              class="flex-1 flex flex-col items-center justify-center text-grey-700"
            >
              <p>{{ $t({ en: 'No courses in this series yet', zh: '这个系列里还没有课程' }) }}</p>
              <p class="mt-2 text-base text-grey-600">
                {{
                  $t({
                    en: 'Click "Create course" to write the first one',
                    zh: '点击"创建课程"开始写第一门课'
                  })
                }}
              </p>
            </div>
            <ul v-else class="flex flex-wrap content-start gap-xl">
              <CourseItem
                v-for="course in slotProps.data.data"
                :key="course.id"
                :course="course"
                @click="openInCourseEditor(course)"
              >
                <CourseItemCornerMenu
                  :course="course"
                  @edit="handleEditCourse(course)"
                  @remove="handleRemoveCourse(course)"
                />
              </CourseItem>
            </ul>
          </div>
        </ListResultWrapper>
        <UIPagination
          v-show="coursePageTotal > 1"
          v-model:current="coursePage"
          class="mt-8 mb-4 justify-center"
          :total="coursePageTotal"
        />
      </template>
    </section>
  </UISearchableModal>
</template>
