<script lang="ts">
export const courseSeriesItemHeight = 214
</script>

<script lang="ts" setup>
import type { CourseSeries } from '@/apis/course-series'
import stageBgUrl from '@/assets/images/stage-bg.svg'
import { UIImg } from '@/components/ui'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithUniversalUrl } from '@/models/common/cloud'

const props = defineProps<{
  courseSeries: CourseSeries
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = props.courseSeries.thumbnail
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})
</script>

<template>
  <li
    v-radar="{
      name: `Course series item \u0022${props.courseSeries.title}\u0022`,
      desc: 'Click to view the course series'
    }"
    class="relative w-58 overflow-hidden rounded-lg transition-all duration-200 hover:cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
    :style="{ height: `${courseSeriesItemHeight}px`, backgroundImage: `url(${stageBgUrl})` }"
  >
    <RouterLink :to="`/course-series/${props.courseSeries.id}`">
      <UIImg class="h-full w-full" :src="thumbnailUrl" size="cover" />
      <div
        class="absolute bottom-0 h-10 w-full overflow-hidden whitespace-nowrap px-4 text-15/10 text-grey-100 text-ellipsis"
        :style="{ background: 'rgb(from var(--ui-color-grey-1000) r g b / 0.2)' }"
      >
        {{ courseSeries.title }}
      </div>
    </RouterLink>
  </li>
</template>
