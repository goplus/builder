<script lang="ts" setup>
import { computed } from 'vue'

import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { UIButton, UIImg } from '@/components/ui'
import { useAsyncComputed } from '@/utils/utils'
import stageBgUrl from '@/assets/images/stage-bg.svg'
import type { TutorialCoursePreview } from './status'

const props = defineProps<{
  course: TutorialCoursePreview
  sequence: number
  current: boolean
  state: 'in-progress' | 'completed' | null
}>()

const emit = defineEmits<{
  select: []
  restart: []
}>()

const thumbnailSource = computed(() => props.course.thumbnail)
const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  if (thumbnailSource.value === '') return null
  return createFileWithUniversalUrl(thumbnailSource.value).url(onCleanup)
})
</script>

<template>
  <li
    v-radar="{ name: `Course: ${course.title}`, desc: 'Click to open this course' }"
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
    <span v-if="state != null" class="flex-none px-1 text-xs font-medium text-primary-main">
      {{ $t(state === 'completed' ? { en: 'completed', zh: '已完成' } : { en: 'in progress', zh: '进行中' }) }}
    </span>
    <UIButton v-if="current" class="ml-auto flex-none" type="white" size="small" @click.stop="emit('restart')">
      {{ $t({ en: 'Restart course', zh: '重新开始' }) }}
    </UIButton>
  </li>
</template>
