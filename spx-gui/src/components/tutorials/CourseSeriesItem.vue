<script lang="ts">
export const courseSeriesItemHeight = 254
</script>

<script lang="ts" setup>
import type { CourseSeries } from '@/apis/course-series'
import stageBgUrl from '@/assets/images/stage-bg.svg'
import { UIImg } from '@/components/ui'
import { humanizeTime, useAsyncComputed } from '@/utils/utils'
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
    class="w-58 overflow-hidden rounded-md border border-grey-400 transition-all duration-200 hover:cursor-pointer hover:shadow-sm"
    :style="{ height: `${courseSeriesItemHeight}px`, backgroundImage: `url(${stageBgUrl})` }"
  >
    <RouterLink :to="`/course-series/${props.courseSeries.id}`" class="no-underline">
      <div class="h-full w-full flex flex-col">
        <UIImg class="flex-auto" :src="thumbnailUrl" size="cover" />
        <div class="flex-none h-20 w-full overflow-hidden p-4 bg-grey-100">
          <div
            class="w-full overflow-hidden whitespace-nowrap text-lg text-title text-ellipsis"
            :title="courseSeries.title"
          >
            {{ courseSeries.title }}
          </div>
          <div class="mt-1 inline-flex items-center gap-3 text-sm text-hint-2">
            <span>
              {{ $t({ en: `${courseSeries.courseIDs.length} Total`, zh: `${courseSeries.courseIDs.length} 节课程` }) }}
            </span>
            <span>{{ $t(humanizeTime(courseSeries.createdAt)) }}</span>
          </div>
        </div>
      </div>
    </RouterLink>
  </li>
</template>
