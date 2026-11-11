<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import { getCourseSeriesPageRoute } from '@/apps/xbuilder/router'
import { getCleanupSignal } from '@/utils/disposable'
import { Cancelled, useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { untilNotNull } from '@/utils/utils'
import { useSeriesWithCourses } from '@/stores/course-series'
import { EditingMode } from '@/components/editor/editing'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { UIButton, UIError, UILoading, useConfirmDialogWithResult } from '@/components/ui'
import { useDropdown } from '@/components/ui/UIDropdown.vue'
import { useTutorial } from './tutorial'
import TutorialStatusCourseRow from './TutorialStatusCourseRow.vue'
import { getSeriesUnits, getUnitHeading } from './units'

const router = useRouter()
const tutorial = useTutorial()
const dropdown = useDropdown()
const editorCtxRef = useEditorCtxRef()
const confirm = useConfirmDialogWithResult()
const { t } = useI18n()
const seriesWithCoursesQuery = useSeriesWithCourses(() => tutorial.currentCourse?.seriesID ?? null)
const courseSeries = computed(() => seriesWithCoursesQuery.data.value?.series ?? null)

const units = computed(() => (courseSeries.value == null ? [] : getSeriesUnits(courseSeries.value)))
const courseGroups = computed(() => {
  const coursesByID = new Map(
    (seriesWithCoursesQuery.data.value?.courses ?? []).map((course, index) => [
      course.id,
      { course, sequence: index + 1 }
    ])
  )
  return units.value.map((unit) => ({
    title: unit.title,
    courses: unit.courseIDs.flatMap((id) => coursesByID.get(id) ?? [])
  }))
})
const courseRows = useTemplateRef<InstanceType<typeof TutorialStatusCourseRow>[]>('courseRows')
const signal = getCleanupSignal(onBeforeUnmount)

// The dropdown remounts the panel on each opening; wait for the course rows to render.
onMounted(async () => {
  try {
    const currentCourseID = tutorial.currentCourse?.id
    if (currentCourseID == null) return
    const row = await untilNotNull(() => courseRows.value?.find((row) => row.courseID === currentCourseID), signal)
    if (!signal.aborted) row.scrollIntoView()
  } catch (error) {
    if (!(error instanceof Cancelled)) throw error
  }
})

async function confirmCourseAction(
  action: LocaleMessage,
  content: LocaleMessage = {
    en: 'The current course learning state will be discarded. Continue?',
    zh: '当前课程的学习状态将被丢弃，确认继续吗？'
  }
) {
  // TODO: Skip confirmation when the course is still in its initial state (https://github.com/goplus/builder/issues/3546).
  return confirm({
    title: t(action),
    content: t(content)
  })
}

function resetEditorDirtyBeforeLeaving() {
  if (tutorial.currentCourse?.kind !== 'guided') return
  const editing = editorCtxRef.value?.state.editing
  // Edits to an effect-free project opened for a Guided Course are part of its learning state.
  // Once the learner confirms discarding that state, reset dirty to skip the editor's route-leave confirmation.
  if (editing?.mode === EditingMode.EffectFree) editing.resetDirty()
}

const { fn: handleExitCourse } = useMessageHandle(
  async () => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null) return
    if (!(await confirmCourseAction({ en: 'Exit course', zh: '退出课程' }))) return
    dropdown?.setVisible(false)
    await tutorial.endCurrentCourse()
  },
  { en: 'Failed to exit course', zh: '退出课程失败' }
)

const { fn: handleReturnSeries } = useMessageHandle(
  async () => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null) return
    if (!(await confirmCourseAction({ en: 'Back to series courses', zh: '返回系列课程' }))) return
    const seriesRoute = getCourseSeriesPageRoute(currentCourse.seriesID, currentCourse.id)
    resetEditorDirtyBeforeLeaving()
    dropdown?.setVisible(false)
    await tutorial.endCurrentCourse()
    if (router.currentRoute.value.fullPath !== seriesRoute) await router.push(seriesRoute)
  },
  { en: 'Failed to return to series courses', zh: '返回系列课程失败' }
)

const { fn: handleSelectCourse } = useMessageHandle(
  async (courseID: string, courseTitle: string) => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null || courseID === currentCourse.id) return
    if (!(await confirmCourseAction({ en: `Start course ${courseTitle}`, zh: `开始课程 ${courseTitle}` }))) return
    resetEditorDirtyBeforeLeaving()
    dropdown?.setVisible(false)
    await tutorial.startCourse(currentCourse.seriesID, courseID)
  },
  { en: 'Failed to start course', zh: '开始课程失败' }
)

const { fn: handleRestartCourse } = useMessageHandle(
  async () => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null) return
    const confirmed = await confirmCourseAction(
      { en: 'Restart course', zh: '重新开始课程' },
      {
        en: 'The current course learning state will be reset. Continue?',
        zh: '当前课程的学习状态将被重置，确认继续吗？'
      }
    )
    if (!confirmed) return
    resetEditorDirtyBeforeLeaving()
    dropdown?.setVisible(false)
    await tutorial.startCourse(currentCourse.seriesID, currentCourse.id)
  },
  { en: 'Failed to restart course', zh: '重新开始课程失败' }
)
</script>

<template>
  <div class="flex max-h-[70vh] w-100 flex-col p-2">
    <header class="flex flex-none items-center justify-between py-1 pl-2 pr-1">
      <span class="text-base font-medium text-text">{{ $t({ en: 'Tutorial', zh: '教程' }) }}</span>
      <UIButton
        v-radar="{ name: 'exit-course-button', desc: 'Click to exit the current course' }"
        type="secondary"
        size="small"
        @click="handleExitCourse"
      >
        {{ $t({ en: 'Exit course', zh: '退出课程' }) }}
      </UIButton>
    </header>

    <div class="mx-2 my-1 h-px flex-none bg-dividing-line-2"></div>

    <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1">
      <UILoading v-if="seriesWithCoursesQuery.isLoading.value" class="h-24" />
      <UIError v-else-if="seriesWithCoursesQuery.error.value != null" :retry="seriesWithCoursesQuery.refetch">
        {{ $t(seriesWithCoursesQuery.error.value.userMessage) }}
      </UIError>
      <template v-for="(group, index) in courseGroups" v-else :key="index">
        <h3 v-if="group.title != null" class="m-0 flex-none truncate px-1 py-2 text-base font-medium text-text">
          {{ $t(getUnitHeading(index, group.title)) }}
        </h3>
        <ul class="flex flex-none flex-col gap-2">
          <TutorialStatusCourseRow
            v-for="{ course, sequence } in group.courses"
            :key="course.id"
            ref="courseRows"
            :course="course"
            :sequence="sequence"
            :active="course.id === tutorial.currentCourse?.id"
            :state="course.id === tutorial.currentCourse?.id ? tutorial.currentCourse?.state ?? null : null"
            @select="handleSelectCourse(course.id, course.title)"
            @restart="handleRestartCourse"
          />
        </ul>
      </template>
    </div>

    <footer class="flex-none p-2">
      <button
        v-radar="{ name: 'back-to-series-courses-button', desc: 'Click to leave the course and open its series page' }"
        type="button"
        class="h-[34px] w-full cursor-pointer rounded-md border border-dividing-line-2 bg-grey-100 text-base text-text transition-colors hover:bg-grey-200"
        @click="handleReturnSeries"
      >
        {{ $t({ en: 'Back to series courses', zh: '返回系列课程' }) }}
      </button>
    </footer>
  </div>
</template>
