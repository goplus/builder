<!-- eslint-disable vue/no-v-html -->
<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { type CourseSeriesWithCourses, type Tutorial } from './tutorial'
import type { Course } from '@/apis/course'
import { useI18n } from '@/utils/i18n'

import { UIButton, UIModal, UIModalClose } from '@/components/ui'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import success from './success.svg?raw'

const props = defineProps<{
  visible: boolean
  tutorial: Tutorial
  course: Course
  series: CourseSeriesWithCourses
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
  router.push('/tutorials')
  emit('cancelled')
}

const { fn: handleStartNextCourse } = useMessageHandle(
  async () => {
    const currentCourse = props.course
    const currentSeries = props.series
    if (!currentCourse || !currentSeries) {
      throw new DefaultException({
        en: 'No course in progress',
        zh: '没有进行中的课程'
      })
    }

    const findIndex = currentSeries.courses.findIndex(({ id }) => id === currentCourse.id)
    if (findIndex === -1 || findIndex + 1 >= currentSeries.courses.length) {
      throw new DefaultException({
        en: 'The course series is complete',
        zh: '课程系列已结束'
      })
    }

    const nextCourse = currentSeries.courses[findIndex + 1]
    await props.tutorial.startCourse(nextCourse, currentSeries)
    emit('cancelled')
  },
  {
    en: 'No next course available',
    zh: '没有下一个课程'
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
    <div class="tutorial-course-success-modal">
      <div class="header">
        <UIModalClose class="close" @click="handleCancel" />
      </div>

      <div class="content">
        <!-- eslint-disable vue/no-v-html -->
        <div class="success" v-html="success"></div>

        <div>{{ $t({ zh: '太棒了!', en: 'Great!' }) }}</div>
        <div>{{ courseCompleteMessage }}</div>

        <div class="actions">
          <UIButton type="boring" size="large" @click="handleBrowseTutorials">
            {{ $t({ zh: '浏览所有教程', en: 'Browse all tutorials' }) }}
          </UIButton>

          <UIButton size="large" @click="handleStartNextCourse">
            {{ $t({ zh: '浏览下一个课程', en: 'Browse next course' }) }}
          </UIButton>
        </div>
      </div>
    </div>
  </UIModal>
</template>

<style lang="scss" scoped>
.tutorial-course-success-modal {
  padding: 16px 20px 24px 20px;

  .header {
    display: flex;
    justify-content: flex-end;
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;

    .success {
      width: fit-content;
      height: fit-content;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 24px;
      width: 100%;
    }
  }
}
</style>
