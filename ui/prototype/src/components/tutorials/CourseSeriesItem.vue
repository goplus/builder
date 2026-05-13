<script lang="ts">
export const courseSeriesItemHeight = 254
</script>

<script setup lang="ts">
import { computed } from 'vue'

import type { CourseSeries } from '@/apis/course-series'
import stageBgUrl from '@/assets/images/stage-bg.svg'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { UIImg } from '@/components/ui'
import { humanizeExactTime, humanizeTime, useAsyncComputed } from '@/utils/utils'

const props = defineProps<{
  courseSeries: CourseSeries
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnailUniversalUrl = props.courseSeries.thumbnail
  if (thumbnailUniversalUrl === '') return null
  const thumbnail = createFileWithUniversalUrl(thumbnailUniversalUrl)
  return thumbnail.url(onCleanup)
})

const updatedAtTitle = computed(() => {
  const exactTime = humanizeExactTime(props.courseSeries.updatedAt)
  return {
    en: `Last updated at ${exactTime.en}`,
    zh: `最后更新于 ${exactTime.zh}`
  }
})
</script>

<template>
  <li
    v-radar="{
      name: `Course series item &quot;${props.courseSeries.title}&quot;`,
      desc: 'Click to view the course series'
    }"
    class="course-series-card"
    :style="{ height: `${courseSeriesItemHeight}px`, backgroundImage: `url(${stageBgUrl})` }"
  >
    <RouterLink :to="`/course-series/${props.courseSeries.id}`" class="no-underline text-inherit">
      <div class="h-full w-full flex flex-col">
        <div class="card-image">
          <UIImg class="h-full w-full" :src="thumbnailUrl" size="cover" />
        </div>
        <div class="card-info">
          <div class="card-title" :title="courseSeries.title">
            {{ courseSeries.title }}
          </div>
          <div class="card-meta">
            <span>
              {{ $t({ en: `${courseSeries.courseIDs.length} Total`, zh: `${courseSeries.courseIDs.length} 节课程` }) }}
            </span>
            <span :title="$t(updatedAtTitle)">
              {{ $t(humanizeTime(courseSeries.updatedAt)) }}
            </span>
          </div>
        </div>
      </div>
    </RouterLink>
  </li>
</template>
