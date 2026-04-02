<script lang="ts" setup>
import type { CourseSeries } from '@/apis/course-series'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  courseSeries: CourseSeries
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (props.courseSeries.thumbnail === '') return null
  const file = createFileWithUniversalUrl(props.courseSeries.thumbnail)
  return file.url(onCleanup)
})
</script>

<template>
  <!-- FIXME: `bg-grey-50` is not taking effect (migrated from legacy code `background: var(--ui-color-grey-50)`) -->
  <li
    class="course-series-item relative h-40 w-58 cursor-pointer overflow-hidden rounded-3 border-2 border-grey-300 bg-grey-50 transition-all duration-200 hover:-translate-y-0.5 hover:border-grey-400 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
  >
    <div v-if="thumbnailUrl != null" class="absolute inset-0">
      <UIImg class="h-full w-full" :src="thumbnailUrl" size="cover" />
    </div>
    <div
      class="relative flex h-full flex-col items-center justify-center p-5 text-center"
      :class="{ 'has-thumbnail': thumbnailUrl != null }"
    >
      <div
        class="absolute top-3 left-3 h-7 w-7 [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]"
        :class="thumbnailUrl != null ? 'text-grey-100' : 'text-grey-900'"
      >
        {{ courseSeries.order }}
      </div>
      <h3
        class="m-0 w-full overflow-hidden text-16/[1.4] text-ellipsis wrap-break-word line-clamp-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]"
        :class="thumbnailUrl != null ? 'text-grey-100' : 'text-grey-900'"
        :title="courseSeries.title"
      >
        {{ courseSeries.title }}
      </h3>
      <div
        class="mt-2"
        :class="thumbnailUrl != null ? 'text-grey-400 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]' : 'text-grey-600'"
      >
        {{
          $t({
            en: `${courseSeries.courseIDs.length} course${courseSeries.courseIDs.length !== 1 ? 's' : ''}`,
            zh: `${courseSeries.courseIDs.length} 个课程`
          })
        }}
      </div>
    </div>

    <div class="action-section absolute top-2 right-2">
      <slot />
    </div>
  </li>
</template>

<style scoped>
.action-section :deep(.corner-menu) {
  visibility: hidden;
  opacity: 0;
  transition: 0.1s;
}

.course-series-item:hover .action-section :deep(.corner-menu) {
  visibility: visible;
  opacity: 1;
}
</style>
