<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/utils/i18n'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { useDragSortable } from '@/utils/drag-and-drop'
import type { CourseKind } from '@/apis/course'
import { listSignedInUserCourseSeries, type CourseSeries } from '@/apis/course-series'
import { useDeleteCourse } from '@/stores/course'
import { useDeleteCourseSeries, useUpdateCourseSeries } from '@/stores/course-series'
import {
  UIButton,
  UIEmpty,
  UIIcon,
  UITabRadio,
  UITabRadioGroup,
  useConfirmDialog,
  useMessage,
  useModal
} from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CourseSeriesItem from '@/components/course/management/CourseSeriesItem.vue'
import CourseSeriesItemCornerMenu from '@/components/course/management/CourseSeriesItemCornerMenu.vue'
import CourseSeriesDrawer from '@/components/course/management/CourseSeriesDrawer.vue'
import { useCourseSeriesFileActions } from '@/components/course/management/series-file-actions'
import { deleteCourseSeriesWithCourses } from '@/components/course/management/series-deletion'
import {
  createSeriesOrderWriter,
  getNextSeriesOrder,
  planSeriesOrder
} from '@/components/course/management/series-order'
import ListControls from '@/components/course/management/ListControls.vue'
import ListSections from '@/components/course/management/ListSections.vue'
import {
  matchesQuery,
  sectionByTitle,
  sectionByUpdatedAt,
  titleIndex,
  updatedAtIndex
} from '@/components/course/management/list-view'
import { useListViewQuery } from '@/components/course/management/list-view-query'
import { getCourseManagementRoute } from '@/apps/xbuilder/router'

usePageTitle({ en: 'Course management', zh: '课程管理' })

const i18n = useI18n()
const m = useMessage()
const confirm = useConfirmDialog()
const route = useRoute()
const router = useRouter()
const updateCourseSeries = useUpdateCourseSeries()
const deleteCourse = useDeleteCourse()
const deleteCourseSeries = useDeleteCourseSeries()
const fileActions = useCourseSeriesFileActions()
const invokeSeriesDrawer = useModal(CourseSeriesDrawer)

// Written like the search and the sort, replacing the history entry instead of adding one.
const kindFilter = computed<'all' | CourseKind>({
  get() {
    const kind = route.query.kind
    return kind === 'guided' || kind === 'playground' ? kind : 'all'
  },
  set(kind) {
    router.replace({ query: { ...route.query, kind: kind === 'all' ? undefined : kind } })
  }
})

function handleKindFilterUpdate(value: string) {
  if (value === 'all' || value === 'guided' || value === 'playground') kindFilter.value = value
}

/** Every series of the author, in the order learners see them. */
async function listAllSeries(signal: AbortSignal) {
  const all: CourseSeries[] = []
  for (let pageIndex = 1; ; pageIndex++) {
    const { data, total } = await listSignedInUserCourseSeries(
      { pageIndex, pageSize: 100, orderBy: 'order', sortOrder: 'asc' },
      signal
    )
    all.push(...data)
    if (data.length === 0 || all.length >= total) return all
  }
}

const seriesQueryRet = useQuery((ctx) => listAllSeries(ctx.signal), {
  en: 'Failed to load course series',
  zh: '加载课程系列失败'
})

/** The series as shown, which a drag reorders before the server has the new order. */
const allSeries = shallowRef<CourseSeries[]>([])
watch(seriesQueryRet.data, (data) => (allSeries.value = data ?? []), { immediate: true })

// A new series goes after the others, which have to be known first.
const canAddSeries = computed(() => seriesQueryRet.data.value != null)

const { query, sortBy } = useListViewQuery()

const shownSeries = computed(() => {
  const kind = kindFilter.value
  return allSeries.value.filter(
    (series) =>
      (kind === 'all' || series.kind === kind) && matchesQuery([series.title, series.description], query.value)
  )
})

const sections = computed(() => {
  if (sortBy.value === 'title') return sectionByTitle(shownSeries.value, (series) => series.title)
  if (sortBy.value === 'updatedAt') return sectionByUpdatedAt(shownSeries.value, (series) => series.updatedAt)
  return []
})

const listRef = ref<HTMLElement>()
// TODO: Reorder in one request once the backend offers one. Until then each series is updated on its own, a few at a
// time with the rest queued, and a failure leaves the others updated.
const writeSeriesOrder = createSeriesOrderWriter((id, order) => updateCourseSeries(id, { order }), 5)

const handleSorted = useMessageHandle(
  async (oldIndex: number, newIndex: number) => {
    const reordered = [...shownSeries.value]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    const { series, updates } = planSeriesOrder(allSeries.value, reordered)
    allSeries.value = series
    const results = await writeSeriesOrder(updates)
    if (results.some((result) => result.status === 'rejected')) {
      seriesQueryRet.refetch()
      throw new DefaultException({
        en: 'Some course series could not be moved; the order shown is the one saved.',
        zh: '部分课程系列没能调整位置，现在显示的是已保存的顺序。'
      })
    }
  },
  { en: 'Failed to reorder course series', zh: '调整课程系列顺序失败' }
).fn

useDragSortable(shownSeries, listRef, {
  ghostClass: 'sortable-ghost-item',
  onSorted: handleSorted
})

function handleOpen(courseSeries: CourseSeries) {
  router.push(getCourseManagementRoute(courseSeries.id))
}

const handleCreate = useMessageHandle(async () => {
  const kind = kindFilter.value === 'all' ? 'guided' : kindFilter.value
  const created = await invokeSeriesDrawer({ courseSeries: null, kind, order: getNextSeriesOrder(allSeries.value) })
  // Courses are created in their series, so the new series is opened for them.
  await router.push(getCourseManagementRoute(created.id))
}).fn

const handleEdit = useMessageHandle(async (courseSeries: CourseSeries) => {
  await invokeSeriesDrawer({ courseSeries, kind: courseSeries.kind, order: courseSeries.order })
  seriesQueryRet.refetch()
}).fn

const handleImport = useMessageHandle(async () => {
  try {
    await fileActions.importAsNewSeries(getNextSeriesOrder(allSeries.value))
  } finally {
    // A cancelled or failed import may have left something its undoing could not.
    seriesQueryRet.refetch()
  }
}).fn

const handleRemove = useMessageHandle(
  async (courseSeries: CourseSeries) => {
    const courseCount = courseSeries.courseIDs.length
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Delete course series', zh: '删除课程系列' }),
      content: i18n.t({
        en: `Delete "${courseSeries.title}" and its ${courseCount} course${courseCount === 1 ? '' : 's'}? This cannot be undone.`,
        zh: `确定删除“${courseSeries.title}”及其中的 ${courseCount} 门课程吗？此操作不可撤销。`
      }),
      confirmText: i18n.t({ en: 'Delete', zh: '删除' })
    })
    try {
      await m.withLoading(
        deleteCourseSeriesWithCourses(courseSeries.id, { deleteCourse, deleteCourseSeries }),
        i18n.t({ en: 'Deleting course series', zh: '删除课程系列中' })
      )
    } finally {
      seriesQueryRet.refetch()
    }
  },
  { en: 'Failed to delete course series', zh: '删除课程系列失败' }
).fn
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-center gap-4">
      <h1 class="m-0 flex-1 text-2xl text-title">{{ $t({ en: 'Course management', zh: '课程管理' }) }}</h1>
      <UITabRadioGroup
        v-radar="{ name: 'kind-filter', desc: 'Filter course series by kind' }"
        class="w-60"
        :value="kindFilter"
        @update:value="handleKindFilterUpdate"
      >
        <UITabRadio value="all">{{ $t({ en: 'All', zh: '全部' }) }}</UITabRadio>
        <UITabRadio value="guided">{{ $t({ en: 'Guided', zh: '引导式' }) }}</UITabRadio>
        <UITabRadio value="playground">{{ $t({ en: 'Playground', zh: '目标式' }) }}</UITabRadio>
      </UITabRadioGroup>
      <UIButton
        v-radar="{ name: 'import-button', desc: 'Click to create a course series from a course series file' }"
        type="neutral"
        :disabled="!canAddSeries"
        @click="handleImport"
      >
        <template #icon><UIIcon type="upload" /></template>
        {{ $t({ en: 'Import from file', zh: '从文件导入' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'create-button', desc: 'Click to create a course series' }"
        type="primary"
        :disabled="!canAddSeries"
        @click="handleCreate"
      >
        <template #icon><UIIcon type="plus" /></template>
        {{ $t({ en: 'Create course series', zh: '新建课程系列' }) }}
      </UIButton>
    </header>

    <ListControls
      v-model:query="query"
      v-model:sort-by="sortBy"
      :placeholder="$t({ en: 'Search course series', zh: '搜索课程系列' })"
    />

    <ListResultWrapper :query-ret="seriesQueryRet" :height="400">
      <template #empty>
        <UIEmpty size="large">{{ $t({ en: 'No course series yet', zh: '还没有课程系列' }) }}</UIEmpty>
      </template>
      <UIEmpty v-if="shownSeries.length === 0" size="large">
        {{
          query.trim() !== ''
            ? $t({ en: 'No course series found', zh: '没有找到匹配的课程系列' })
            : $t({ en: 'No course series of this kind', zh: '没有这种类型的课程系列' })
        }}
      </UIEmpty>
      <ListSections
        v-else-if="sortBy !== 'order'"
        :sections="sections"
        :index="sortBy === 'title' ? titleIndex : updatedAtIndex"
        show-index
      >
        <template #default="{ section }">
          <ul class="m-0 flex flex-wrap gap-5 p-0">
            <CourseSeriesItem
              v-for="courseSeries in section.items"
              :key="courseSeries.id"
              v-radar="{
                name: 'course-series-item',
                desc: 'Click to open the courses of the series',
                attrs: { name: courseSeries.title }
              }"
              :course-series="courseSeries"
              @click="handleOpen(courseSeries)"
            >
              <CourseSeriesItemCornerMenu
                :course-series="courseSeries"
                @edit="handleEdit(courseSeries)"
                @remove="handleRemove(courseSeries)"
              />
            </CourseSeriesItem>
          </ul>
        </template>
      </ListSections>
      <ul
        v-else
        ref="listRef"
        v-radar="{ name: 'course-series-list', desc: 'The course series, which can be dragged to reorder' }"
        class="m-0 flex flex-wrap gap-5 p-0"
      >
        <CourseSeriesItem
          v-for="courseSeries in shownSeries"
          :key="courseSeries.id"
          v-radar="{
            name: 'course-series-item',
            desc: 'Click to open the courses of the series',
            attrs: { name: courseSeries.title }
          }"
          :course-series="courseSeries"
          @click="handleOpen(courseSeries)"
        >
          <CourseSeriesItemCornerMenu
            :course-series="courseSeries"
            @edit="handleEdit(courseSeries)"
            @remove="handleRemove(courseSeries)"
          />
        </CourseSeriesItem>
      </ul>
    </ListResultWrapper>
  </div>
</template>

<style scoped>
ul :deep(.sortable-ghost-item) {
  opacity: 0.4;
}
</style>
