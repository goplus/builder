<script lang="ts">
export const courseItemHeight = 214
</script>

<script lang="ts" setup>
import { type Course } from '@/apis/course'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useAsyncComputed } from '@/utils/utils'
import { UIImg } from '@/components/ui'

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
    class="relative w-58 overflow-hidden rounded-lg transition-all hover:cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
    :style="{ height: `${courseItemHeight}px` }"
  >
    <UIImg class="h-full w-full" :src="thumbnailUrl" size="cover" />

    <div
      class="absolute bottom-0 h-10 w-full overflow-hidden bg-grey-1000/30 px-4 text-15/10 whitespace-nowrap text-ellipsis text-grey-100"
    >
      {{ course.title }}
    </div>
  </li>
</template>
