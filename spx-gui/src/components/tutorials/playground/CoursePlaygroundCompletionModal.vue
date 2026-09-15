<script lang="ts">
export type CompletionAction = 'continueEditing' | 'next' | 'exit'
</script>

<script setup lang="ts">
import { computed } from 'vue'

import type { Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { UIButton, UIImg, UIModal, UIModalClose } from '@/components/ui'

import successImg from '../success.png'

const props = defineProps<{
  visible: boolean
  course: Course
  series: CourseSeries
  feedback: string | null
}>()

const hasNextCourse = computed(() => {
  const courseIndex = props.series.courseIDs.indexOf(props.course.id)
  return courseIndex >= 0 && courseIndex < props.series.courseIDs.length - 1
})

const emit = defineEmits<{
  cancelled: []
  resolved: [action: CompletionAction]
}>()
</script>

<template>
  <UIModal :visible="visible" size="small" @update:visible="emit('resolved', 'continueEditing')">
    <div class="px-5 pt-4 pb-6">
      <div class="flex justify-end">
        <UIModalClose @click="emit('resolved', 'continueEditing')" />
      </div>

      <div class="flex flex-col items-center text-center">
        <UIImg :src="successImg" class="h-47.5 w-67.5" />
        <div class="mt-5 text-2xl">{{ $t({ en: 'Great!', zh: '太棒了！' }) }}</div>
        <div class="mt-2 text-base">
          {{ $t({ en: `${course.title} course completed`, zh: `${course.title}课程已完成` }) }}
        </div>
        <p v-if="feedback != null" class="mt-3 whitespace-pre-wrap text-sm text-grey-900">{{ feedback }}</p>

        <div class="mt-10 w-full flex flex-col gap-5">
          <UIButton type="neutral" size="large" @click="emit('resolved', 'exit')">
            {{ $t({ en: 'Back to course series', zh: '返回课程系列' }) }}
          </UIButton>
          <UIButton v-if="hasNextCourse" size="large" @click="emit('resolved', 'next')">
            {{ $t({ en: 'Learn next course', zh: '学习下一个课程' }) }}
          </UIButton>
        </div>
      </div>
    </div>
  </UIModal>
</template>
