<script lang="ts">
export const courseItemHeight = 230
</script>

<script lang="ts" setup>
import { type Course } from '@/apis/course'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useAsyncComputed } from '@/utils/utils'
import { UIImg } from '@/components/ui'
import stageBgUrl from '@/assets/images/stage-bg.svg'

const props = defineProps<{
  course: Course
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = props.course.thumbnail
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})
</script>

<template>
  <li
    v-radar="{ name: `Course item \u0022${props.course.title}\u0022`, desc: 'Click to start the course' }"
    class="group w-58 overflow-hidden rounded-md border border-grey-400 transition-all duration-200 hover:cursor-pointer hover:shadow-sm flex flex-col"
    :style="{ height: `${courseItemHeight}px`, backgroundImage: `url(${stageBgUrl})` }"
  >
    <UIImg class="flex-auto w-full bg-top" :src="thumbnailUrl" size="cover" />

    <div class="flex-none w-full bg-grey-100 p-4 text-lg text-title">
      <div
        class="overflow-hidden whitespace-nowrap text-ellipsis group-hover:whitespace-normal group-hover:line-clamp-2"
        :title="course.title"
      >
        {{ course.title }}
      </div>
    </div>
  </li>
</template>
