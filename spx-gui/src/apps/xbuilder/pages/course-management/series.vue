<script setup lang="ts">
import { computed, ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import { ConcurrencyLimitController } from '@/utils/concurrency-limit'
import { useI18n } from '@/utils/i18n'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useAsyncComputed, usePageTitle } from '@/utils/utils'
import { useDragSortable } from '@/utils/drag-and-drop'
import { isGuidedCourse, type Course } from '@/apis/course'
import type { CourseSeries, CourseSeriesUnitParams } from '@/apis/course-series'
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
import UnitHeaderItem from '@/components/course/management/UnitHeaderItem.vue'
import { useLocalEdits } from '@/components/course/management/local-edits'
import UnitTitleModal from '@/components/course/management/UnitTitleModal.vue'
import {
  addUnit,
  moveCourseInUnitList,
  moveCourseToUnit,
  moveUnit,
  removeUnit,
  renameUnit,
  splitUnitAt,
  toUnitList,
  type UnitListItem
} from '@/components/course/management/units'
import { getUnitLabel } from '@/components/tutorials/units'
import GuidedCourseDrawer from '@/components/course/management/GuidedCourseDrawer.vue'
import PlaygroundCourseDrawer from '@/components/course/management/PlaygroundCourseDrawer.vue'
import { courseKindNames } from '@/components/course/management/kind'
import { useCourseSeriesFileActions } from '@/components/course/management/series-file-actions'
import { usePageModals } from '@/components/course/management/page-modals'
import { deleteCourseSeriesWithCourses } from '@/components/course/management/series-deletion'
import ListControls from '@/components/course/management/ListControls.vue'
import ListSections from '@/components/course/management/ListSections.vue'
import {
  hasSameIDs,
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
const invokeUnitTitleModal = useModal(UnitTitleModal)
const { keepPageFor } = usePageModals()

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

// The course order and the units are both written to the order of the series' courses, so they share a queue.
const seriesWrites = new ConcurrencyLimitController(1)

/** The courses as shown, which a drag reorders before the server has the new order. */
const {
  value: courses,
  edit: editCourses,
  settled: courseEditsWritten
} = useLocalEdits(() => coursesQueryRet.data.value ?? [], seriesWrites)

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
    // A course missing from the list, such as one added since it was loaded, would be dropped by the reorder.
    if (
      !hasSameIDs(
        courses.value.map((course) => course.id),
        series.courseIDs
      )
    ) {
      throw new DefaultException({
        en: 'The courses of this series are not all shown, so they cannot be reordered here',
        zh: '这个系列的课程没有全部显示，无法在这里调整顺序'
      })
    }
    const reorderedShown = [...shownCourses.value]
    const [moved] = reorderedShown.splice(oldIndex, 1)
    reorderedShown.splice(newIndex, 0, moved)
    const reordered = placeReordered(courses.value, reorderedShown, (course) => course.id)
    try {
      await editCourses(reordered, async (edited) => {
        await updateCourseSeries(series.id, { courseIDs: edited.map((course) => course.id) })
      })
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

/** The units as shown, which an edit changes before the server has them. */
const {
  value: units,
  edit: editUnits,
  settled: unitEditsWritten
} = useLocalEdits<CourseSeriesUnitParams[]>(() => seriesQueryRet.data.value?.units ?? [], seriesWrites)

/** Done once the edits made so far are written: what goes on with the series next starts from them. */
async function editsWritten() {
  await Promise.all([courseEditsWritten(), unitEditsWritten()])
}

// A page opened next for the series would read it without the edits still being written, which would then overwrite
// what is done there.
onBeforeRouteLeave(editsWritten)
onBeforeRouteUpdate(async (to, from) => {
  if (to.path !== from.path) await editsWritten()
})
const isDivided = computed(() => units.value.length > 0)
/** Set while a unit is being added: it has no ID until the server answers, and a later write would add it again. */
const isAddingUnit = ref(false)

const coursesByID = computed(() => new Map(courses.value.map((course) => [course.id, course])))
/** The units and their courses as listed: with a search, only the courses that match, under every unit. */
const shownUnitList = computed(() =>
  toUnitList(units.value).flatMap(
    (item): Array<Extract<UnitListItem, { type: 'unit' }> | { type: 'course'; course: Course }> => {
      if (item.type === 'unit') return [item]
      const course = coursesByID.value.get(item.courseID)
      return course != null && matchesQuery([course.title], query.value) ? [{ type: 'course', course }] : []
    }
  )
)
// A course moved in a list that leaves some out would take its place among them, so only the whole list is dragged.
const canDragUnitList = computed(
  () => !isAddingUnit.value && shownUnitList.value.length === toUnitList(units.value).length
)

const unitListRef = ref<HTMLElement>()

async function writeUnits(series: CourseSeries, edited: CourseSeriesUnitParams[]) {
  const addsUnit = edited.some((unit) => unit.id == null)
  if (addsUnit) isAddingUnit.value = true
  try {
    // The units the server returns give a new unit its ID.
    await editUnits(edited, async (units) => (await updateCourseSeries(series.id, { units })).units)
  } catch (e) {
    refetch()
    throw e
  } finally {
    if (addsUnit) isAddingUnit.value = false
  }
}

const handleUnitListSorted = useMessageHandle(
  async (oldIndex: number, newIndex: number) => {
    const series = courseSeries.value
    if (series == null) return
    await writeUnits(series, moveCourseInUnitList(units.value, oldIndex, newIndex))
  },
  { en: 'Failed to move course', zh: '移动课程失败' }
).fn

useDragSortable(() => (canDragUnitList.value ? shownUnitList.value : null), unitListRef, {
  ghostClass: 'sortable-ghost-item',
  filterItem: (item) => (item as UnitListItem).type === 'unit',
  // Every course is in a unit; one dropped before the first header would be put back, leaving the list out of step.
  filterMove: (_, newIndex) => newIndex === 0,
  onSorted: handleUnitListSorted
})

function askUnitTitle(action: { en: string; zh: string }, title = '', tip?: { en: string; zh: string }) {
  return keepPageFor(invokeUnitTitleModal({ action, title, tip }))
}

const handleAddUnit = useMessageHandle(
  async (series: CourseSeries) => {
    const tip = isDivided.value
      ? { en: 'The new unit is added at the end, empty.', zh: '新单元是空的，加在最后。' }
      : {
          en: 'All courses of the series go into the first unit, in their order.',
          zh: '系列现有的课程会按原来的顺序全部放进第一个单元。'
        }
    const title = await askUnitTitle({ en: 'New unit', zh: '新建单元' }, '', tip)
    // The courses as shown, in an order a reorder still being written may have given them, go into the first unit.
    const courseIDs = courses.value.map((course) => course.id)
    if (!isDivided.value && !hasSameIDs(courseIDs, courseSeries.value?.courseIDs ?? [])) {
      throw new DefaultException({
        en: 'The courses of this series are not all shown, so they cannot be put into a unit here',
        zh: '这个系列的课程没有全部显示，无法在这里放进单元'
      })
    }
    await writeUnits(series, addUnit(units.value, title, courseIDs))
  },
  { en: 'Failed to add unit', zh: '新建单元失败' }
).fn

const handleRenameUnit = useMessageHandle(
  async (series: CourseSeries, unitIndex: number) => {
    const title = await askUnitTitle({ en: 'Rename unit', zh: '重命名单元' }, units.value[unitIndex].title)
    await writeUnits(series, renameUnit(units.value, unitIndex, title))
  },
  { en: 'Failed to rename unit', zh: '重命名单元失败' }
).fn

const handleMoveUnit = useMessageHandle(
  (series: CourseSeries, unitIndex: number, offset: number) =>
    writeUnits(series, moveUnit(units.value, unitIndex, offset)),
  { en: 'Failed to move unit', zh: '移动单元失败' }
).fn

const handleRemoveUnit = useMessageHandle(
  async (series: CourseSeries, unitIndex: number) => {
    const unit = units.value[unitIndex]
    const count = unit.courseIDs.length
    let content: { en: string; zh: string }
    if (units.value.length === 1) {
      content = {
        en: `Delete "${unit.title}"? The series will no longer be divided into units; its courses keep their order.`,
        zh: `确定删除“${unit.title}”吗？删除后系列不再分单元，课程保持原来的顺序。`
      }
    } else if (count === 0) {
      content = { en: `Delete "${unit.title}"?`, zh: `确定删除“${unit.title}”吗？` }
    } else {
      const into =
        unitIndex === 0 ? { en: 'the next unit', zh: '下一个单元' } : { en: 'the unit before', zh: '上一个单元' }
      content = {
        en: `Delete "${unit.title}"? Its ${count} course${count === 1 ? '' : 's'} will join ${into.en}.`,
        zh: `确定删除“${unit.title}”吗？其中的 ${count} 门课程会并入${into.zh}。`
      }
    }
    await keepPageFor(
      confirm({
        title: i18n.t({ en: 'Delete unit', zh: '删除单元' }),
        content: i18n.t(content),
        confirmText: i18n.t({ en: 'Delete', zh: '删除' })
      })
    )
    await writeUnits(series, removeUnit(units.value, unitIndex))
  },
  { en: 'Failed to delete unit', zh: '删除单元失败' }
).fn

const handleSplitUnit = useMessageHandle(
  async (series: CourseSeries, course: Course) => {
    const title = await askUnitTitle({ en: 'New unit', zh: '新建单元' }, '', {
      en: `"${course.title}" and the courses after it in its unit form the new unit.`,
      zh: `“${course.title}”和本单元里它之后的课程会组成新单元。`
    })
    await writeUnits(series, splitUnitAt(units.value, course.id, title))
  },
  { en: 'Failed to add unit', zh: '新建单元失败' }
).fn

const handleMoveCourseToUnit = useMessageHandle(
  (series: CourseSeries, course: Course, unitIndex: number) =>
    writeUnits(series, moveCourseToUnit(units.value, course.id, unitIndex)),
  { en: 'Failed to move course', zh: '移动课程失败' }
).fn

/** The other units a course can be moved to. */
function getMoveTargets(courseID: string) {
  return units.value.flatMap((unit, unitIndex) =>
    unit.courseIDs.includes(courseID) ? [] : [{ unitIndex, label: getUnitLabel(unitIndex) }]
  )
}

/** Whether a new unit can start at the course: it is not the first of its unit. */
function canSplitAt(courseID: string) {
  return units.value.some((unit) => unit.courseIDs.indexOf(courseID) > 0)
}

function handleBack() {
  // Back to the list as the author left it, filter included, when that is where they came from.
  const back = router.options.history.state.back
  if (typeof back === 'string' && back.split('?')[0] === getCourseManagementRoute()) router.back()
  else router.push(getCourseManagementRoute())
}

function openInCourseEditor(series: CourseSeries, course: Course) {
  return router.push(getCourseEditorRoute(series.id, course.id))
}

const handleCreateCourse = useMessageHandle(async (series: CourseSeries, unitID: string | null = null) => {
  // The course is added to the series as the server has it then, which edits still being written would overwrite.
  await editsWritten()
  if (series.kind === 'guided') {
    await keepPageFor(invokeGuidedCourseDrawer({ course: null, courseSeriesID: series.id, unitID }))
    refetch()
    return
  }
  const { course } = await keepPageFor(
    invokePlaygroundCourseDrawer({ course: null, courseSeriesID: series.id, unitID })
  )
  await openInCourseEditor(series, course)
}).fn

const handleOpenCourse = useMessageHandle(async (series: CourseSeries, course: Course) => {
  if (isGuidedCourse(course)) {
    await keepPageFor(invokeGuidedCourseDrawer({ course, courseSeriesID: series.id }))
    return
  }
  const { openEditor } = await keepPageFor(invokePlaygroundCourseDrawer({ course, courseSeriesID: series.id }))
  if (openEditor) await openInCourseEditor(series, course)
}).fn

const handleRemoveCourse = useMessageHandle(
  async (course: Course) => {
    await keepPageFor(
      confirm({
        type: 'warning',
        title: i18n.t({ en: 'Delete course', zh: '删除课程' }),
        content: i18n.t({
          en: `Delete "${course.title}"? This cannot be undone.`,
          zh: `确定删除“${course.title}”吗？此操作不可撤销。`
        }),
        confirmText: i18n.t({ en: 'Delete', zh: '删除' })
      })
    )
    await m.withLoading(deleteCourse(course.id), i18n.t({ en: 'Deleting course', zh: '删除课程中' }))
    refetch()
  },
  { en: 'Failed to delete course', zh: '删除课程失败' }
).fn

const handleEditSeries = useMessageHandle(async (series: CourseSeries) => {
  await keepPageFor(invokeSeriesDrawer({ courseSeries: series, kind: series.kind, order: series.order }))
}).fn

const handleExport = useMessageHandle((series: CourseSeries) => keepPageFor(fileActions.exportSeries(series)), {
  en: 'Failed to export course series file',
  zh: '导出课程系列文件失败'
}).fn

const handleImport = useMessageHandle(
  async (series: CourseSeries) => {
    try {
      // An import replaces the courses and units of the series, which edits still being written would overwrite.
      await editsWritten()
      await keepPageFor(fileActions.importIntoSeries(series))
    } finally {
      refetch()
    }
  },
  { en: 'Failed to import course series file', zh: '导入课程系列文件失败' }
).fn

const handleRemoveSeries = useMessageHandle(
  async (series: CourseSeries) => {
    const courseCount = series.courseIDs.length
    await keepPageFor(
      confirm({
        type: 'warning',
        title: i18n.t({ en: 'Delete course series', zh: '删除课程系列' }),
        content: i18n.t({
          en: `Delete "${series.title}" and its ${courseCount} course${courseCount === 1 ? '' : 's'}? This cannot be undone.`,
          zh: `确定删除“${series.title}”及其中的 ${courseCount} 门课程吗？此操作不可撤销。`
        }),
        confirmText: i18n.t({ en: 'Delete', zh: '删除' })
      })
    )
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
            v-radar="{ name: 'add-unit-button', desc: 'Click to add a unit to the series' }"
            type="secondary"
            :disabled="isAddingUnit"
            @click="handleAddUnit(courseSeries)"
          >
            <template #icon><UIIcon type="plus" /></template>
            {{ $t({ en: 'New unit', zh: '新建单元' }) }}
          </UIButton>
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
        <UIEmpty v-else-if="courses.length === 0 && !isDivided" size="large">
          {{ $t({ en: 'No courses in this series yet', zh: '这个系列还没有课程' }) }}
        </UIEmpty>
        <UIEmpty v-else-if="shownCourses.length === 0 && (!isDivided || query !== '')" size="large">
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
                  :move-targets="getMoveTargets(course.id)"
                  :can-split="canSplitAt(course.id)"
                  @edit="handleOpenCourse(courseSeries, course)"
                  @open-editor="openInCourseEditor(courseSeries, course)"
                  @split="handleSplitUnit(courseSeries, course)"
                  @move-to-unit="handleMoveCourseToUnit(courseSeries, course, $event)"
                  @remove="handleRemoveCourse(course)"
                />
              </CourseItem>
            </ul>
          </template>
        </ListSections>
        <ul
          v-else-if="isDivided"
          ref="unitListRef"
          v-radar="{
            name: 'unit-list',
            desc: 'The units of the series, each followed by its courses, which can be dragged to reorder them or to move them to another unit'
          }"
          class="m-0 flex flex-wrap gap-5 p-0"
        >
          <template
            v-for="item in shownUnitList"
            :key="item.type === 'unit' ? `unit:${units[item.unitIndex].id ?? item.unitIndex}` : item.course.id"
          >
            <UnitHeaderItem
              v-if="item.type === 'unit'"
              :unit-index="item.unitIndex"
              :title="units[item.unitIndex].title"
              :course-count="units[item.unitIndex].courseIDs.length"
              :can-move-up="item.unitIndex > 0"
              :can-move-down="item.unitIndex < units.length - 1"
              :disabled="isAddingUnit"
              @create-course="handleCreateCourse(courseSeries, units[item.unitIndex].id ?? null)"
              @rename="handleRenameUnit(courseSeries, item.unitIndex)"
              @move-up="handleMoveUnit(courseSeries, item.unitIndex, -1)"
              @move-down="handleMoveUnit(courseSeries, item.unitIndex, 1)"
              @remove="handleRemoveUnit(courseSeries, item.unitIndex)"
            />
            <CourseItem
              v-else
              v-radar="{ name: 'course-item', desc: 'Click to edit the course', attrs: { name: item.course.title } }"
              :course="item.course"
              @click="handleOpenCourse(courseSeries, item.course)"
            >
              <CourseItemCornerMenu
                :course="item.course"
                :move-targets="getMoveTargets(item.course.id)"
                :can-split="canSplitAt(item.course.id)"
                @edit="handleOpenCourse(courseSeries, item.course)"
                @open-editor="openInCourseEditor(courseSeries, item.course)"
                @split="handleSplitUnit(courseSeries, item.course)"
                @move-to-unit="handleMoveCourseToUnit(courseSeries, item.course, $event)"
                @remove="handleRemoveCourse(item.course)"
              />
            </CourseItem>
          </template>
        </ul>
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
