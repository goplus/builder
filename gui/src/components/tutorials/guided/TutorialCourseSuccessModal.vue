<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useCourse } from '@/stores/course'
import { useSeries } from '@/stores/course-series'
import { useI18n } from '@/utils/i18n'

import { UIButton, UIError, UIImg, UILoading, UIModal, UIModalClose } from '@/components/ui'
import { DefaultException, useMessageHandle } from '@/utils/exception'

import { useTutorial } from '../tutorial'
import successImg from '../success.png'

const props = defineProps<{
  visible: boolean
  courseID: string
  seriesID: string
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const i18n = useI18n()
const router = useRouter()
const tutorial = useTutorial()
const courseQueryRet = useCourse(() => props.courseID)
const seriesQueryRet = useSeries(() => props.seriesID)

const courseCompleteMessage = computed(() => {
  return i18n.t({
    en: `${courseQueryRet.data.value?.title} course completed`,
    zh: `${courseQueryRet.data.value?.title}课程已完成`
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
  const currentSeries = seriesQueryRet.data.value
  if (currentSeries == null) return false
  const index = currentSeries.courseIDs.indexOf(props.courseID)
  return index !== -1 && index + 1 < currentSeries.courseIDs.length
})

const { fn: handleStartNextCourse } = useMessageHandle(
  async () => {
    const currentSeries = seriesQueryRet.data.value
    if (currentSeries == null) return
    const findIndex = currentSeries.courseIDs.indexOf(props.courseID)
    if (findIndex === -1 || findIndex + 1 >= currentSeries.courseIDs.length) {
      throw new DefaultException({
        en: 'The course series is complete',
        zh: '课程系列已结束'
      })
    }

    const nextCourseID = currentSeries.courseIDs[findIndex + 1]
    emit('cancelled')
    await tutorial.startCourse(currentSeries.id, nextCourseID)
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
      name: 'tutorial-course-success-modal',
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

      <UILoading v-if="courseQueryRet.isLoading.value || seriesQueryRet.isLoading.value" class="h-40" />
      <UIError v-else-if="courseQueryRet.error.value != null" :retry="courseQueryRet.refetch">
        {{ $t(courseQueryRet.error.value.userMessage) }}
      </UIError>
      <UIError v-else-if="seriesQueryRet.error.value != null" :retry="seriesQueryRet.refetch">
        {{ $t(seriesQueryRet.error.value.userMessage) }}
      </UIError>
      <div v-else class="flex flex-col items-center text-center">
        <UIImg :src="successImg" class="h-47.5 w-67.5" />

        <div class="mt-5 text-2xl">{{ $t({ en: 'Great!', zh: '太棒了!' }) }}</div>
        <div class="mt-2 text-base">{{ courseCompleteMessage }}</div>

        <div class="mt-10 w-full flex flex-col gap-5">
          <UIButton
            v-if="hasNextCourse"
            v-radar="{ name: 'course-next', desc: 'Start the next Course' }"
            size="large"
            @click="handleStartNextCourse"
          >
            {{ $t({ en: 'Learn next course', zh: '学习下一个课程' }) }}
          </UIButton>
          <UIButton
            v-radar="{ name: 'browse-courses', desc: 'Browse all courses' }"
            type="white"
            size="large"
            @click="handleBrowseTutorials"
          >
            {{ $t({ en: 'Browse all courses', zh: '浏览所有课程' }) }}
          </UIButton>
        </div>
      </div>
    </div>
  </UIModal>
</template>
