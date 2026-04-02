<script lang="ts" setup>
import type { Course } from '@/apis/course'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { createFileWithWebUrl } from '@/models/common/cloud'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  course: Course
  interactive?: boolean
  highlighted?: boolean
  dimmed?: boolean
}>()

const thumbnailUrl = useAsyncComputedLegacy(async (onCleanup) => {
  if (props.course.thumbnail == null) return null
  const file = createFileWithWebUrl(props.course.thumbnail)
  return file.url(onCleanup)
})
</script>

<template>
  <!-- FIXME: `bg-grey-50` is not taking effect -->
  <div
    class="flex items-center rounded-1 border-2 border-transparent bg-grey-50 p-2 transition-all duration-200"
    :class="{
      'cursor-pointer hover:bg-primary-100': interactive,
      'border-grey-400 bg-grey-100': highlighted,
      'opacity-50': dimmed
    }"
  >
    <slot name="prefix" />
    <UIImg class="h-9 w-12 shrink-0 rounded-1" :src="thumbnailUrl" size="cover" />
    <div class="mx-3 flex-1 overflow-hidden">
      <div class="overflow-hidden text-body font-medium text-grey-900 text-ellipsis whitespace-nowrap">
        {{ course.title }}
      </div>
    </div>
    <slot name="suffix" />
  </div>
</template>
