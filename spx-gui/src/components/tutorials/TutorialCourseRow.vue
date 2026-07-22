<script lang="ts" setup>
import { type Course } from '@/apis/course'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useAsyncComputed } from '@/utils/utils'
import { UIImg } from '@/components/ui'
import stageBgUrl from '@/assets/images/stage-bg.svg'

const props = defineProps<{
  course: Course
  /** The course currently in progress — shown with an "in progress" badge and a restart action. */
  current: boolean
}>()

const emit = defineEmits<{
  select: []
  restart: []
}>()

const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (props.course.thumbnail === '') return null
  return createFileWithUniversalUrl(props.course.thumbnail).url(onCleanup)
})
</script>

<template>
  <li
    v-radar="{ name: `Course: ${props.course.title}`, desc: 'Click to open this course' }"
    class="flex h-11 flex-none cursor-pointer items-center gap-2 rounded-[6px] py-1 pl-1 pr-2 transition-colors hover:bg-grey-200"
    @click="emit('select')"
  >
    <UIImg
      class="h-9 w-12 flex-none rounded-sm"
      :src="thumbnailUrl"
      size="cover"
      :style="{ backgroundImage: `url(${stageBgUrl})` }"
    />
    <span class="min-w-0 truncate text-base font-medium text-text">{{ course.title }}</span>
    <span v-if="current" class="flex-none px-1 text-xs font-medium text-primary-main">{{
      $t({ en: 'in progress', zh: '进行中' })
    }}</span>
    <button
      v-if="current"
      class="ml-auto h-5 flex-none cursor-pointer rounded-sm border border-dividing-line-2 bg-grey-300 px-2 text-xs font-medium text-text transition-colors hover:bg-grey-400"
      @click.stop="emit('restart')"
    >
      {{ $t({ en: 'Restart course', zh: '重新开始' }) }}
    </button>
  </li>
</template>
