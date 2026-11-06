<script setup lang="ts">
import { UICard, UIIcon, UITooltip } from '@/components/ui'
import { courseViews, getViewIcon, getViewLabel, type CourseView } from './course-views'

defineProps<{
  /** The view on screen. */
  open: CourseView
  dirtyViews: Set<CourseView>
}>()

const emit = defineEmits<{
  select: [view: CourseView]
}>()
</script>

<template>
  <UICard class="w-14 flex-none rounded-l-none">
    <nav
      v-radar="{ name: 'course-activity-bar', desc: 'Buttons that switch between the parts of the course' }"
      class="flex h-full flex-col py-2"
    >
      <UITooltip v-for="view in courseViews" :key="view" placement="right">
        <template #trigger>
          <button
            v-radar="{
              name: 'activity-bar-button',
              desc: `Click to open ${getViewLabel(view).en}`,
              attrs: { view }
            }"
            class="relative flex h-12 w-full cursor-pointer items-center justify-center border-none bg-transparent"
            :class="view === open ? 'text-primary-main' : 'text-grey-700 hover:text-title'"
            @click="emit('select', view)"
          >
            <span
              v-if="view === open"
              class="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-r bg-primary-main"
            ></span>
            <UIIcon class="h-6 w-6" :type="getViewIcon(view)" />
            <span
              v-if="dirtyViews.has(view)"
              class="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-primary-main"
            ></span>
          </button>
        </template>
        {{ $t(getViewLabel(view)) }}
      </UITooltip>
    </nav>
  </UICard>
</template>
