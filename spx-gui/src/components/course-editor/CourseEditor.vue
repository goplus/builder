<script setup lang="ts">
import type { PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton } from '@/components/ui'

defineProps<{
  course: PlaygroundCourse
  series: CourseSeries
  /** The author's working copy of the Tutorial project; the page owns its lifecycle. */
  project: TutorialProject
}>()
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <header
      v-radar="{ name: 'Course editor toolbar', desc: 'Course title, series and actions for the course being edited' }"
      class="flex items-center gap-4 border-b border-line px-6 py-3"
    >
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg font-semibold">{{ course.title }}</h1>
        <p class="truncate text-sm text-grey-700">{{ series.title }}</p>
      </div>
      <UIButton
        v-radar="{ name: 'Preview course button', desc: 'Click to preview the course as a learner' }"
        type="secondary"
        disabled
      >
        {{ $t({ en: 'Preview', zh: '预览' }) }}
      </UIButton>
      <UIButton v-radar="{ name: 'Save course button', desc: 'Click to save the course' }" type="primary" disabled>
        {{ $t({ en: 'Save', zh: '保存' }) }}
      </UIButton>
    </header>
    <!-- The embedded project editor, course program and asset panes land here in later steps. -->
    <section class="flex flex-1 items-center justify-center text-grey-700">
      {{ $t({ en: 'Course project editor coming soon', zh: '课程项目编辑器即将接入' }) }}
    </section>
  </div>
</template>
