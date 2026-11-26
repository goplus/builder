<script lang="ts" setup>
import { useTemplateRef } from 'vue'

import type { Course } from '@/apis/course'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { UIButton, UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import stageBgUrl from '@/assets/images/stage-bg.svg'
import { CourseState } from './tutorial'

const props = withDefaults(
  defineProps<{
    course: Course
    sequence: number
    active: boolean
    state: CourseState | null
    editing?: boolean
    href?: string | null
  }>(),
  { editing: false, href: null }
)

const emit = defineEmits<{
  select: []
  restart: []
}>()

const [thumbnailUrl] = useFileUrl(() =>
  props.course.thumbnail === '' ? null : createFileWithUniversalUrl(props.course.thumbnail)
)

const row = useTemplateRef<HTMLLIElement>('row')

function handleLinkClick(event: MouseEvent) {
  event.stopPropagation()
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  emit('select')
}

defineExpose({
  get courseID() {
    return props.course.id
  },
  scrollIntoView() {
    row.value?.scrollIntoView({ block: 'center', inline: 'nearest' })
  }
})
</script>

<template>
  <li
    ref="row"
    v-radar="{
      name: 'tutorial-course-row',
      desc: active ? 'Current course in the series' : 'Click to open this course',
      attrs: { name: course.title }
    }"
    :aria-current="active ? (href == null ? 'step' : 'page') : undefined"
    class="relative flex h-11 flex-none cursor-pointer items-center gap-2 rounded-[6px] py-1 pl-1 pr-2 transition-colors"
    :class="active ? 'bg-turquoise-100 hover:bg-turquoise-200' : 'hover:bg-grey-200'"
    @click="emit('select')"
  >
    <a
      v-if="href != null"
      v-radar="{
        name: 'edit-course-link',
        desc: 'Open this course in the Course Editor',
        attrs: { name: course.title }
      }"
      :href="href"
      class="absolute inset-0 z-1 rounded-[6px] focus-visible:outline-2 focus-visible:outline-primary-main focus-visible:-outline-offset-2"
      @click="handleLinkClick"
    ></a>
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
    <span v-if="editing || state != null" class="flex-none px-1 text-xs font-medium text-primary-main">
      {{
        $t(
          editing
            ? { en: 'editing', zh: '正在编辑' }
            : state === CourseState.Completed
              ? { en: 'completed', zh: '已完成' }
              : { en: 'in progress', zh: '进行中' }
        )
      }}
    </span>
    <UIButton
      v-if="active && href == null"
      class="ml-auto flex-none"
      type="white"
      size="small"
      @click.stop="emit('restart')"
    >
      {{ $t({ en: 'Restart course', zh: '重新开始' }) }}
    </UIButton>
  </li>
</template>
