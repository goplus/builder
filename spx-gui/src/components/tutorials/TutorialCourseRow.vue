<script lang="ts" setup>
import { computed } from 'vue'
import { type Course } from '@/apis/course'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useAsyncComputed } from '@/utils/utils'
import { UIButton, UIImg } from '@/components/ui'
import stageBgUrl from '@/assets/images/stage-bg.svg'

const props = defineProps<{
  course: Course
  sequence: number
  thumbnail?: string
  /** The course currently in progress — shown with an "in progress" badge and a restart action. */
  current: boolean
}>()

const emit = defineEmits<{
  select: []
  restart: []
}>()

const thumbnailSource = computed(() => props.course.thumbnail || props.thumbnail || '')
const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (thumbnailSource.value === '') return null
  return createFileWithUniversalUrl(thumbnailSource.value).url(onCleanup)
})
</script>

<template>
  <li
    v-radar="{ name: `Course: ${props.course.title}`, desc: 'Click to open this course' }"
    :aria-current="current ? 'step' : undefined"
    class="flex h-11 flex-none cursor-pointer items-center gap-2 rounded-[6px] py-1 pl-1 pr-2 transition-colors"
    :class="current ? 'bg-turquoise-100 hover:bg-turquoise-200' : 'hover:bg-grey-200'"
    @click="emit('select')"
  >
    <div
      class="relative h-9 w-12 flex-none overflow-hidden rounded-sm bg-cover bg-center"
      :style="{ backgroundImage: `url(${stageBgUrl})` }"
    >
      <span
        class="absolute inset-0 flex items-center justify-center bg-white/25 text-sm font-semibold text-primary-main"
      >
        {{ sequence }}
      </span>
      <UIImg v-if="thumbnailSource !== ''" class="absolute inset-0 h-full w-full" :src="thumbnailUrl" size="cover" />
    </div>
    <span class="min-w-0 truncate text-base font-medium text-text">{{ course.title }}</span>
    <span v-if="current" class="flex-none px-1 text-xs font-medium text-primary-main">{{
      $t({ en: 'in progress', zh: '进行中' })
    }}</span>
    <UIButton v-if="current" class="ml-auto flex-none" type="white" size="small" @click.stop="emit('restart')">
      {{ $t({ en: 'Restart course', zh: '重新开始' }) }}
    </UIButton>
  </li>
</template>
