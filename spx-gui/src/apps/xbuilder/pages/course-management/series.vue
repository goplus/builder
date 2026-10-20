<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/utils/i18n'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useAsyncComputed, usePageTitle } from '@/utils/utils'
import { useDragSortable } from '@/utils/drag-and-drop'
import { isGuidedCourse, type Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useDeleteCourse } from '@/stores/course'
import { useDeleteCourseSeries, useSeries, useSeriesCourses, useUpdateCourseSeries } from '@/stores/course-series'
import { useSignedInUser } from '@/stores/user'
import {
  UIButton,
  UIEmpty,
  UIError,
  UIIcon,
  UIImg,
  UILoading,
  UITag,
  useConfirmDialog,
  useMessage,
  useModal
} from '@/components/ui'
import CourseItem from '@/components/course/management/CourseItem.vue'
import CourseItemCornerMenu from '@/components/course/management/CourseItemCornerMenu.vue'
import CourseSeriesDrawer from '@/components/course/management/CourseSeriesDrawer.vue'
import GuidedCourseDrawer from '@/components/course/management/GuidedCourseDrawer.vue'
import PlaygroundCourseDrawer from '@/components/course/management/PlaygroundCourseDrawer.vue'
import { courseKindNames } from '@/components/course/management/kind'
import { useCourseSeriesFileActions } from '@/components/course/management/series-file-actions'
import { deleteCourseSeriesWithCourses } from '@/components/course/management/series-deletion'
import ListControls from '@/components/course/management/ListControls.vue'
import ListSections from '@/components/course/management/ListSections.vue'
import {
  matchesQuery,
  placeReordered,
  sectionByTitle,
  sectionByUpdatedAt,
  titleIndex,
  updatedAtIndex
} from '@/components/course/management/list-view'
import { useListViewQuery } from '@/components/course/management/list-view-query'
import { getCourseEditorRoute, getCourseManagementRoute } from '@/apps/xbuilder/router'

const props = defineProps<{
  courseSeriesIdInput: string
}>()

const i18n = useI18n()
const m = useMessage()
const confirm = useConfirmDialog()
const router = useRouter()
const signedInUser = useSignedInUser()
const updateCourseSeries = useUpdateCourseSeries()
const deleteCourse = useDeleteCourse()
const deleteCourseSeries = useDeleteCourseSeries()
const fileActions = useCourseSeriesFileActions()
const invokeSeriesDrawer = useModal(CourseSeriesDrawer)
const invokeGuidedCourseDrawer = useModal(GuidedCourseDrawer)
const invokePlaygroundCourseDrawer = useModal(PlaygroundCourseDrawer)

const seriesQueryRet = useSeries(() => props.courseSeriesIdInput)
const coursesQueryRet = useSeriesCourses(() => props.courseSeriesIdInput)

const courseSeries = computed(() => seriesQueryRet.data.value)
// Only the author's own series are managed here; another author's could be read but not changed.
const isOwnSeries = computed(
  () => courseSeries.value != null && courseSeries.value.owner === signedInUser.value?.username
)

usePageTitle(() => {
  const title = courseSeries.value?.title
  const page = { en: 'Course management', zh: '课程管理' }
  // Series titles are not localized, so the same string is used for both languages.
  return title == null ? page : [{ en: title, zh: title }, page]
})

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnail = courseSeries.value?.thumbnail
  if (thumbnail == null || thumbnail === '') return null
  return createFileWithUniversalUrl(thumbnail).url(onCleanup)
})

/** The courses as shown, which a drag reorders before the server has the new order. */
const courses = shallowRef<Course[]>([])
watch(coursesQueryRet.data, (data) => (courses.value = data ?? []), { immediate: true })

const { query, sortBy } = useListViewQuery()
const shownCourses = computed(() => courses.value.filter((course) => matchesQuery([course.title], query.value)))
const sections = computed(() => {
  if (sortBy.value === 'title') return sectionByTitle(shownCourses.value, (course) => course.title)
  if (sortBy.value === 'updatedAt') return sectionByUpdatedAt(shownCourses.value, (course) => course.updatedAt)
  return []
})
// A series of a few courses is seen at a glance, without an index.
const indexMinCourseCount = 20

function refetch() {
  seriesQueryRet.refetch()
  coursesQueryRet.refetch()
}

const listRef = ref<HTMLElement>()

const handleSorted = useMessageHandle(
  async (oldIndex: number, newIndex: number) => {
    const series = courseSeries.value
    if (series == null) return
    // The list holds at most one page of courses; reordering a longer series from it would drop the rest.
    if (courses.value.length !== series.courseIDs.length) {
      throw new DefaultException({
        en: 'The courses of this series are not all shown, so they cannot be reordered here',
        zh: '这个系列的课程没有全部显示，无法在这里调整顺序'
      })
    }
    const reorderedShown = [...shownCourses.value]
    const [moved] = reorderedShown.splice(oldIndex, 1)
    reorderedShown.splice(newIndex, 0, moved)
    const reordered = placeReordered(courses.value, reorderedShown, (course) => course.id)
    courses.value = reordered
    try {
      await updateCourseSeries(series.id, { courseIDs: reordered.map((course) => course.id) })
    } catch (e) {
      refetch()
      throw e
    }
  },
  { en: 'Failed to reorder courses', zh: '调整课程顺序失败' }
).fn

useDragSortable(shownCourses, listRef, {
  ghostClass: 'sortable-ghost-item',
  onSorted: handleSorted
})

function handleBack() {
  // Back to the list as the author left it, filter included, when that is where they came from.
  const back = router.options.history.state.back
  if (typeof back === 'string' && back.split('?')[0] === getCourseManagementRoute()) router.back()
  else router.push(getCourseManagementRoute())
}

function openInCourseEditor(series: CourseSeries, course: Course) {
  return router.push(getCourseEditorRoute(series.id, course.id))
}

const handleCreateCourse = useMessageHandle(async (series: CourseSeries) => {
  if (series.kind === 'guided') {
    await invokeGuidedCourseDrawer({ course: null, courseSeriesID: series.id })
    refetch()
    return
  }
  const { course } = await invokePlaygroundCourseDrawer({ course: null, courseSeriesID: series.id })
  await openInCourseEditor(series, course)
}).fn

const handleOpenCourse = useMessageHandle(async (series: CourseSeries, course: Course) => {
  if (isGuidedCourse(course)) {
    await invokeGuidedCourseDrawer({ course, courseSeriesID: series.id })
    return
  }
  const { openEditor } = await invokePlaygroundCourseDrawer({ course, courseSeriesID: series.id })
  if (openEditor) await openInCourseEditor(series, course)
}).fn

const handleRemoveCourse = useMessageHandle(
  async (course: Course) => {
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Delete course', zh: '删除课程' }),
      content: i18n.t({
        en: `Delete "${course.title}"? This cannot be undone.`,
        zh: `确定删除“${course.title}”吗？此操作不可撤销。`
      }),
      confirmText: i18n.t({ en: 'Delete', zh: '删除' })
    })
    await m.withLoading(deleteCourse(course.id), i18n.t({ en: 'Deleting course', zh: '删除课程中' }))
    refetch()
  },
  { en: 'Failed to delete course', zh: '删除课程失败' }
).fn

const handleEditSeries = useMessageHandle(async (series: CourseSeries) => {
  await invokeSeriesDrawer({ courseSeries: series, kind: series.kind, order: series.order })
}).fn

const handleExport = useMessageHandle((series: CourseSeries) => fileActions.exportSeries(series), {
  en: 'Failed to export course series file',
  zh: '导出课程系列文件失败'
}).fn

const handleImport = useMessageHandle(
  async (series: CourseSeries) => {
    try {
      await fileActions.importIntoSeries(series)
    } finally {
      refetch()
    }
  },
  { en: 'Failed to import course series file', zh: '导入课程系列文件失败' }
).fn

const handleRemoveSeries = useMessageHandle(
  async (series: CourseSeries) => {
    const courseCount = series.courseIDs.length
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Delete course series', zh: '删除课程系列' }),
      content: i18n.t({
        en: `Delete "${series.title}" and its ${courseCount} course${courseCount === 1 ? '' : 's'}? This cannot be undone.`,
        zh: `确定删除“${series.title}”及其中的 ${courseCount} 门课程吗？此操作不可撤销。`
      }),
      confirmText: i18n.t({ en: 'Delete', zh: '删除' })
    })
    try {
      await m.withLoading(
        deleteCourseSeriesWithCourses(series.id, { deleteCourse, deleteCourseSeries }),
        i18n.t({ en: 'Deleting course series', zh: '删除课程系列中' })
      )
    } catch (e) {
      refetch()
      throw e
    }
    await router.push(getCourseManagementRoute())
  },
  { en: 'Failed to delete course series', zh: '删除课程系列失败' }
).fn
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex min-h-10 items-center gap-3">
      <UIButton
        v-radar="{ name: 'back-button', desc: 'Click to go back to the list of course series' }"
        type="neutral"
        shape="circle"
        icon="back"
        @click="handleBack"
      />
      <template v-if="courseSeries != null">
        <h1 class="m-0 truncate text-2xl text-title">{{ courseSeries.title }}</h1>
        <UITag :color="courseSeries.kind === 'playground' ? 'primary' : 'default'">
          {{ $t(courseKindNames[courseSeries.kind]) }}
        </UITag>
      </template>
    </header>

    <UILoading v-if="seriesQueryRet.isLoading.value" class="h-80" :mask="false" />
    <UIError v-else-if="seriesQueryRet.error.value != null" class="h-80" :retry="seriesQueryRet.refetch">
      {{ $t(seriesQueryRet.error.value.userMessage) }}
    </UIError>
    <UIError v-else-if="courseSeries != null && !isOwnSeries" class="h-80">
      {{ $t({ en: 'This course series is not yours', zh: '这个课程系列不属于你' }) }}
      <template #sub-message>
        {{ $t({ en: 'Only your own course series are managed here.', zh: '这里只能管理你自己的课程系列。' }) }}
      </template>
    </UIError>
    <template v-else-if="courseSeries != null">
      <section class="flex gap-6 rounded-lg bg-grey-100 p-6">
        <UIImg class="h-40 w-58 shrink-0 rounded-md" :src="thumbnailUrl" size="cover" />
        <div class="min-w-0 flex-1 flex flex-col gap-2">
          <p class="m-0 whitespace-pre-wrap text-grey-800">
            {{ courseSeries.description }}
          </p>
          <div class="mt-auto flex flex-wrap gap-3">
            <UIButton
              v-radar="{ name: 'edit-series-button', desc: 'Click to edit the title, thumbnail and description' }"
              type="secondary"
              @click="handleEditSeries(courseSeries)"
            >
              <template #icon><UIIcon type="edit" /></template>
              {{ $t({ en: 'Edit series', zh: '编辑系列' }) }}
            </UIButton>
            <UIButton
              v-radar="{ name: 'export-button', desc: 'Click to export the series to a course series file' }"
              type="neutral"
              @click="handleExport(courseSeries)"
            >
              {{ $t({ en: 'Export to file', zh: '导出到文件' }) }}
            </UIButton>
            <UIButton
              v-radar="{
                name: 'import-button',
                desc: 'Click to replace the courses with those of a course series file'
              }"
              type="neutral"
              @click="handleImport(courseSeries)"
            >
              <template #icon><UIIcon type="upload" /></template>
              {{ $t({ en: 'Import from file', zh: '从文件导入' }) }}
            </UIButton>
            <UIButton
              v-radar="{ name: 'delete-series-button', desc: 'Click to delete the series and its courses' }"
              type="red"
              @click="handleRemoveSeries(courseSeries)"
            >
              <template #icon><UIIcon type="trash" /></template>
              {{ $t({ en: 'Delete series', zh: '删除系列' }) }}
            </UIButton>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <header class="flex flex-wrap items-center gap-4">
          <h2 class="m-0 text-xl text-title">
            {{ $t({ en: `Courses (${courses.length})`, zh: `课程（${courses.length}）` }) }}
          </h2>
          <ListControls
            v-model:query="query"
            v-model:sort-by="sortBy"
            class="flex-1"
            :placeholder="$t({ en: 'Search courses', zh: '搜索课程' })"
          />
          <UIButton
            v-radar="{ name: 'create-course-button', desc: 'Click to create a course in the series' }"
            type="primary"
            @click="handleCreateCourse(courseSeries)"
          >
            <template #icon><UIIcon type="plus" /></template>
            {{ $t({ en: 'Create course', zh: '新建课程' }) }}
          </UIButton>
        </header>

        <UILoading v-if="coursesQueryRet.isLoading.value && courses.length === 0" class="h-60" :mask="false" />
        <UIError v-else-if="coursesQueryRet.error.value != null" class="h-60" :retry="coursesQueryRet.refetch">
          {{ $t(coursesQueryRet.error.value.userMessage) }}
        </UIError>
        <UIEmpty v-else-if="courses.length === 0" size="large">
          {{ $t({ en: 'No courses in this series yet', zh: '这个系列还没有课程' }) }}
        </UIEmpty>
        <UIEmpty v-else-if="shownCourses.length === 0" size="large">
          {{ $t({ en: 'No courses found', zh: '没有找到匹配的课程' }) }}
        </UIEmpty>
        <ListSections
          v-else-if="sortBy !== 'order'"
          :sections="sections"
          :index="sortBy === 'title' ? titleIndex : updatedAtIndex"
          :show-index="courses.length >= indexMinCourseCount"
        >
          <template #default="{ section }">
            <ul class="m-0 flex flex-wrap gap-5 p-0">
              <CourseItem
                v-for="course in section.items"
                :key="course.id"
                v-radar="{ name: 'course-item', desc: 'Click to edit the course', attrs: { name: course.title } }"
                :course="course"
                @click="handleOpenCourse(courseSeries, course)"
              >
                <CourseItemCornerMenu
                  :course="course"
                  @edit="handleOpenCourse(courseSeries, course)"
                  @open-editor="openInCourseEditor(courseSeries, course)"
                  @remove="handleRemoveCourse(course)"
                />
              </CourseItem>
            </ul>
          </template>
        </ListSections>
        <ul
          v-else
          ref="listRef"
          v-radar="{ name: 'course-list', desc: 'The courses of the series, which can be dragged to reorder' }"
          class="m-0 flex flex-wrap gap-5 p-0"
        >
          <CourseItem
            v-for="course in shownCourses"
            :key="course.id"
            v-radar="{ name: 'course-item', desc: 'Click to edit the course', attrs: { name: course.title } }"
            :course="course"
            @click="handleOpenCourse(courseSeries, course)"
          >
            <CourseItemCornerMenu
              :course="course"
              @edit="handleOpenCourse(courseSeries, course)"
              @open-editor="openInCourseEditor(courseSeries, course)"
              @remove="handleRemoveCourse(course)"
            />
          </CourseItem>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
ul :deep(.sortable-ghost-item) {
  opacity: 0.4;
}
</style>
