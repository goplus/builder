<!-- eslint-disable vue/no-v-html -->
<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { type Tutorial } from './tutorial'
import { getCourse, type Course } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { useI18n } from '@/utils/i18n'

import { UIButton, UIModal, UIModalClose } from '@/components/ui'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import success from './success.svg?raw'

const props = defineProps<{
  visible: boolean
  tutorial: Tutorial
  course: Course
  series: CourseSeries
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const i18n = useI18n()
const router = useRouter()

const courseCompleteMessage = computed(() => {
  return i18n.t({
    zh: `${props.course?.title}课程已完成`,
    en: `${props.course?.title} course completed`
  })
})

function handleCancel() {
  emit('cancelled')
}

function handleBrowseTutorials() {
  emit('cancelled')
  router.push('/tutorials')
}

const hasNextCourse = computed(() => {
  const currentCourse = props.course
  const currentSeries = props.series
  const index = currentSeries.courseIDs.indexOf(currentCourse.id)
  return index !== -1 && index + 1 < currentSeries.courseIDs.length
})

const { fn: handleStartNextCourse } = useMessageHandle(
  async () => {
    const currentCourse = props.course
    const currentSeries = props.series
    const findIndex = currentSeries.courseIDs.indexOf(currentCourse.id)
    if (findIndex === -1 || findIndex + 1 >= currentSeries.courseIDs.length) {
      throw new DefaultException({
        en: 'The course series is complete',
        zh: '课程系列已结束'
      })
    }

    const tutorial = props.tutorial
    const nextCourse = await getCourse(currentSeries.courseIDs[findIndex + 1])
    emit('cancelled')
    await tutorial.startCourse(nextCourse, currentSeries)
  },
  {
    en: 'Failed to learn next course',
    zh: '学习下一个课程失败'
  }
)
</script>

<template>
  <UIModal
    v-radar="{
      name: 'Tutorial Course Success Modal',
      desc: 'Modal shown when a tutorial course is successfully completed'
    }"
    :visible="visible"
    size="small"
    mask-closable
    @update:visible="handleCancel"
  >
    <div class="px-5 pt-4 pb-6">
      <div class="flex justify-end">
        <UIModalClose class="close" @click="handleCancel" />
      </div>

      <div class="flex flex-col items-center justify-center text-center">
        <!-- eslint-disable vue/no-v-html -->
        <div class="h-fit w-fit" v-html="success"></div>

        <div>{{ $t({ zh: '太棒了!', en: 'Great!' }) }}</div>
        <div>{{ courseCompleteMessage }}</div>

        <div class="mt-6 w-full flex flex-col gap-5">
          <UIButton type="neutral" size="large" @click="handleBrowseTutorials">
            {{ $t({ zh: '浏览所有课程', en: 'Browse all courses' }) }}
          </UIButton>

          <UIButton v-if="hasNextCourse" size="large" @click="handleStartNextCourse">
            {{ $t({ zh: '学习下一个课程', en: 'Learn next course' }) }}
          </UIButton>
        </div>
      </div>
    </div>
  </UIModal>
</template>
