<script lang="ts" setup>
import type { Course } from '@/apis/course'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { UIButton, UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import stageBgUrl from '@/assets/images/stage-bg.svg'
import { CourseState } from './tutorial'

const props = defineProps<{
  course: Course
  sequence: number
  active: boolean
  state: CourseState | null
}>()

const emit = defineEmits<{
  select: []
  restart: []
}>()

const [thumbnailUrl] = useFileUrl(() =>
  props.course.thumbnail === '' ? null : createFileWithUniversalUrl(props.course.thumbnail)
)
</script>

<template>
  <li
    v-radar="{
      name: 'tutorial-course-row',
      desc: active ? 'Current course in the series' : 'Click to start this course',
      attrs: { name: course.title }
    }"
    :aria-current="active ? 'step' : undefined"
    class="flex h-11 flex-none cursor-pointer items-center gap-2 rounded-[6px] py-1 pl-1 pr-2 transition-colors"
    :class="active ? 'bg-turquoise-100 hover:bg-turquoise-200' : 'hover:bg-grey-200'"
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
      <UIImg v-if="course.thumbnail !== ''" class="absolute inset-0 h-full w-full" :src="thumbnailUrl" size="cover" />
    </div>
    <span class="min-w-0 truncate text-base font-medium text-text">{{ course.title }}</span>
    <span v-if="state != null" class="flex-none px-1 text-xs font-medium text-primary-main">
      {{
        $t(state === CourseState.Completed ? { en: 'completed', zh: '已完成' } : { en: 'in progress', zh: '进行中' })
      }}
    </span>
    <UIButton v-if="active" class="ml-auto flex-none" type="white" size="small" @click.stop="emit('restart')">
      {{ $t({ en: 'Restart course', zh: '重新开始' }) }}
    </UIButton>
  </li>
</template>
