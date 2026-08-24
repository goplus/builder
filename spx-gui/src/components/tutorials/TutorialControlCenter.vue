<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listCourses } from '@/apis/course'
import { listSignedInUserProjects, listUserPublicProjects } from '@/apis/project'
import { useAsyncComputed } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { UIButton, useConfirmDialog } from '@/components/ui'
import { useDropdown } from '@/components/ui/UIDropdown.vue'
import { useTutorial } from './tutorial'
import TutorialCourseRow from './TutorialCourseRow.vue'
import { useSignedInUser } from '@/stores/user'
import { scrollCurrentCourseIntoView } from './tutorial-control-center'
import { getTutorialChapter, getTutorialChapters } from './tutorial-chapters'

const emit = defineEmits<{
  /** Ask the host (the navbar dropdown) to close after a navigation. */
  navigated: []
}>()

const tutorial = useTutorial()
const router = useRouter()
const i18n = useI18n()
const confirm = useConfirmDialog()
const dropdown = useDropdown()

const series = computed(() => tutorial.currentSeries)
const currentCourseId = computed(() => tutorial.currentCourse?.id ?? null)
const courseListRef = ref<HTMLElement | null>(null)

// The whole series, in order, so the learner can see where they are and jump between courses.
const courses = useAsyncComputed(async () => {
  const ids = series.value?.courseIDs ?? []
  if (ids.length === 0) return []

  // Fetch the series in one request instead of issuing one request per course. Besides making
  // the control center appear immediately, this keeps each course's own thumbnail attached to
  // the item rendered in the series order.
  const result = await listCourses({
    courseSeriesID: series.value?.id,
    pageIndex: 1,
    pageSize: ids.length,
    orderBy: 'sequenceInCourseSeries'
  })
  const coursesById = new Map(result.data.map((course) => [course.id, course]))
  return ids.map((id) => coursesById.get(id)).filter((course) => course != null)
})
const chapters = computed(() => getTutorialChapters(series.value))

watch(
  [courses, currentCourseId],
  async ([loadedCourses, courseId]) => {
    if (loadedCourses == null || courseId == null) return
    await nextTick()
    scrollCurrentCourseIntoView(courseListRef.value)
  },
  { immediate: true }
)

const signedInUser = useSignedInUser()
const projectThumbnails = useAsyncComputed(async () => {
  const currentCourses = courses.value ?? []
  const projectNamesByOwner = new Map<string, Set<string>>()
  for (const course of currentCourses) {
    if (course.thumbnail !== '') continue
    const match = course.entrypoint.match(/\/editor\/([^/]+)\/([^/]+)/)
    if (match == null) continue
    const owner = decodeURIComponent(match[1]!)
    const name = decodeURIComponent(match[2]!)
    const names = projectNamesByOwner.get(owner) ?? new Set<string>()
    names.add(name)
    projectNamesByOwner.set(owner, names)
  }
  const projectsByFullName = new Map<string, string>()
  await Promise.all(
    Array.from(projectNamesByOwner.entries()).map(async ([owner, names]) => {
      const firstName = names.values().next().value as string | undefined
      const prefix = firstName?.split('-').slice(0, 2).join('-')
      const params = { pageIndex: 1, pageSize: 100, ...(prefix != null ? { keyword: prefix } : {}) }
      const projects =
        signedInUser.value?.username.toLowerCase() === owner.toLowerCase()
          ? await listSignedInUserProjects(params)
          : await listUserPublicProjects(owner, params)
      for (const project of projects.data) projectsByFullName.set(`${owner}/${project.name}`, project.thumbnail)
    })
  )
  const thumbnails = new Map<string, string>()
  for (const course of currentCourses) {
    const match = course.entrypoint.match(/\/editor\/([^/]+)\/([^/]+)/)
    if (match == null) continue
    const fullName = `${decodeURIComponent(match[1]!)}/${decodeURIComponent(match[2]!)}`
    const thumbnail = projectsByFullName.get(fullName)
    if (thumbnail != null && thumbnail !== '') thumbnails.set(course.id, thumbnail)
  }
  return thumbnails
})

function selectCourse(courseId: string) {
  const seriesId = series.value?.id
  if (seriesId == null || courseId === currentCourseId.value) return
  router.push(`/course/${seriesId}/${courseId}/start`)
  emit('navigated')
}

const { fn: handleReturnSeries } = useMessageHandle(
  async () => {
    // Back to the page of the series being learned; the tutorials index is only a fallback.
    const seriesId = series.value?.id
    await router.push(seriesId == null ? '/tutorials' : `/course-series/${seriesId}`)
    emit('navigated')
  },
  { en: 'Failed to open the course series', zh: '打开系列课程失败' }
)

const { fn: handleExitCourse } = useMessageHandle(() => tutorial.exitCurrentCourse(), {
  en: 'Failed to exit course',
  zh: '退出课程失败'
})

const { fn: handleRestartCourse } = useMessageHandle(
  async () => {
    dropdown?.setVisible(false)
    await confirm({
      title: i18n.t({ en: 'Restart course', zh: '重新开始课程' }),
      content: i18n.t({
        en: 'The course will start over and your changes to the course project will be discarded. Are you sure to continue?',
        zh: '课程将重新开始，你对课程项目的修改将被丢弃，确定继续吗？'
      })
    })
    await tutorial.restartCurrentCourse()
  },
  { en: 'Failed to restart course', zh: '重新开始课程失败' }
)
</script>

<template>
  <div class="flex max-h-[70vh] w-100 flex-col p-2">
    <header class="flex flex-none items-center justify-between py-1 pl-2 pr-1">
      <span class="text-base font-medium text-text">{{ $t({ en: 'Tutorial', zh: '教程' }) }}</span>
      <UIButton
        v-radar="{ name: 'Exit course', desc: 'Click to exit the current course and return to the course list' }"
        type="secondary"
        size="small"
        @click="handleExitCourse"
      >
        {{ $t({ en: 'Exit course', zh: '退出课程' }) }}
      </UIButton>
    </header>

    <div class="mx-2 my-1 h-px flex-none bg-dividing-line-2"></div>

    <ul ref="courseListRef" class="min-h-0 flex-1 flex flex-col gap-2 overflow-y-auto p-1">
      <template v-for="(course, index) in courses ?? []" :key="course.id">
        <li
          v-if="getTutorialChapter(chapters, index + 1)?.start === index + 1"
          class="flex flex-none items-baseline gap-2 px-1 py-2 text-grey-700"
        >
          <span class="flex-none text-sm font-medium text-text">
            {{ $t(getTutorialChapter(chapters, index + 1)!.shortTitle) }}
          </span>
          <span class="min-w-0 truncate text-xs">
            {{ $t(getTutorialChapter(chapters, index + 1)!.title) }}
          </span>
          <span class="ml-auto flex-none text-xs text-grey-600">
            {{ getTutorialChapter(chapters, index + 1)?.start }}–{{ getTutorialChapter(chapters, index + 1)?.end }}
          </span>
        </li>
        <TutorialCourseRow
          :course="course"
          :sequence="index + 1"
          :thumbnail="projectThumbnails?.get(course.id)"
          :current="course.id === currentCourseId"
          @select="selectCourse(course.id)"
          @restart="handleRestartCourse"
        />
      </template>
    </ul>

    <footer class="flex-none p-2">
      <button
        v-radar="{ name: 'Return to series courses', desc: 'Click to leave the course and open its series page' }"
        class="h-[34px] w-full cursor-pointer rounded-md border border-dividing-line-2 bg-grey-100 text-base text-text transition-colors hover:bg-grey-200"
        @click="handleReturnSeries"
      >
        {{ $t({ en: 'Back to series courses', zh: '返回系列课程' }) }}
      </button>
    </footer>
  </div>
</template>
