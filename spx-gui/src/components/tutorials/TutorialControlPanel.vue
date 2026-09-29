<script lang="ts" setup>
import { useRouter } from 'vue-router'

import { getCourseSeriesPageRoute } from '@/apps/xbuilder/router'
import { useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { useSeriesCourses } from '@/stores/course-series'
import { EditingMode } from '@/components/editor/editing'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { UIButton, UILoading, useConfirmDialogWithResult } from '@/components/ui'
import { useDropdown } from '@/components/ui/UIDropdown.vue'
import { useTutorial } from './tutorial'
import TutorialStatusCourseRow from './TutorialStatusCourseRow.vue'

const router = useRouter()
const tutorial = useTutorial()
const dropdown = useDropdown()
const editorCtxRef = useEditorCtxRef()
const confirm = useConfirmDialogWithResult()
const { t } = useI18n()
const coursesQueryRet = useSeriesCourses(() => tutorial.currentCourse?.series.id ?? null)
const courses = coursesQueryRet.data

async function confirmCourseAction(
  action: LocaleMessage,
  content: LocaleMessage = {
    en: 'The current course learning state will be discarded.',
    zh: '当前课程的学习状态将被丢弃。'
  }
) {
  // TODO: Skip confirmation when the course is still in its initial state (https://github.com/goplus/builder/issues/3546).
  return confirm({
    title: t(action),
    content: t(content),
    cancelText: t({ en: 'Cancel', zh: '取消' }),
    confirmText: t(action)
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
    if (tutorial.currentCourse == null) return
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
    resetEditorDirtyBeforeLeaving()
    dropdown?.setVisible(false)
    await tutorial.endCurrentCourse()
    const seriesRoute = getCourseSeriesPageRoute(currentCourse.series.id)
    if (router.currentRoute.value.path !== seriesRoute) await router.push(seriesRoute)
  },
  { en: 'Failed to return to series courses', zh: '返回系列课程失败' }
)

const { fn: handleSelectCourse } = useMessageHandle(
  async (courseID: string) => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null || courseID === currentCourse.id) return
    if (!(await confirmCourseAction({ en: 'Open another course', zh: '切换课程' }))) return
    resetEditorDirtyBeforeLeaving()
    dropdown?.setVisible(false)
    await tutorial.startCourse(currentCourse.series.id, courseID)
  },
  { en: 'Failed to open course', zh: '打开课程失败' }
)

const { fn: handleRestartCourse } = useMessageHandle(
  async () => {
    const currentCourse = tutorial.currentCourse
    if (currentCourse == null) return
    const confirmed = await confirmCourseAction(
      { en: 'Restart course', zh: '重新开始课程' },
      { en: 'The current course learning state will be reset.', zh: '当前课程的学习状态将被重置。' }
    )
    if (!confirmed) return
    resetEditorDirtyBeforeLeaving()
    dropdown?.setVisible(false)
    await tutorial.startCourse(currentCourse.series.id, currentCourse.id)
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

    <div class="min-h-0 flex-1 overflow-y-auto p-1">
      <UILoading v-if="coursesQueryRet.isLoading.value" class="h-24" />
      <ul v-else class="flex flex-col gap-2">
        <TutorialStatusCourseRow
          v-for="(course, index) in courses ?? []"
          :key="course.id"
          :course="course"
          :sequence="index + 1"
          :active="course.id === tutorial.currentCourse?.id"
          :state="course.id === tutorial.currentCourse?.id ? tutorial.currentCourse?.state ?? null : null"
          @select="handleSelectCourse(course.id)"
          @restart="handleRestartCourse"
        />
      </ul>
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
