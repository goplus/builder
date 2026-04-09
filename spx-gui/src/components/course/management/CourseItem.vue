<script lang="ts" setup>
import type { Course } from '@/apis/course'
import { useAsyncComputed } from '@/utils/utils'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  course: Course
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (props.course.thumbnail == null) return null
  const file = await createFileWithUniversalUrl(props.course.thumbnail)
  return file.url(onCleanup)
})
</script>

<template>
  <li
    class="course-item relative box-border h-53.5 w-58 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-grey-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-grey-400 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
  >
    <UIImg class="h-full w-full" :src="thumbnailUrl" size="cover" />
    <div
      class="absolute bottom-0 w-full box-border overflow-hidden bg-grey-1000/30 px-4 text-15/10 font-semibold text-grey-100 text-ellipsis whitespace-nowrap"
      :title="course.title"
    >
      {{ course.title }}
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

.course-item:hover .action-section :deep(.corner-menu) {
  visibility: visible;
  opacity: 1;
}
</style>
