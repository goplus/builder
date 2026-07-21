<script lang="ts" setup>
import { type Course } from '@/apis/course'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useAsyncComputed } from '@/utils/utils'
import { UIImg, UIButton } from '@/components/ui'
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
    class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-grey-200"
    :class="{ 'bg-grey-200': current }"
    @click="emit('select')"
  >
    <UIImg
      class="h-9 w-12 flex-none rounded-sm"
      :src="thumbnailUrl"
      size="cover"
      :style="{ backgroundImage: `url(${stageBgUrl})` }"
    />
    <span class="min-w-0 flex-1 truncate text-sm text-title">{{ course.title }}</span>
    <span v-if="current" class="flex-none text-xs text-primary-main">{{
      $t({ en: 'in progress', zh: '进行中' })
    }}</span>
    <UIButton v-if="current" class="flex-none" type="secondary" size="small" @click.stop="emit('restart')">
      {{ $t({ en: 'Restart course', zh: '重新开始' }) }}
    </UIButton>
  </li>
</template>
