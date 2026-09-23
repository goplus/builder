<script setup lang="ts">
/**
 * Purpose: The Course Editor's activity bar, a narrow column along the left edge like the one in VS Code: one icon
 * button per view of the course (`course-views.ts`). The open view is marked, and a view with unsaved changes
 * carries a dot. It holds no state: what is open and what is unsaved come in as props, and a click is reported to
 * the parent, which navigates.
 *
 * Props:
 * - `open`: the view on screen.
 * - `dirtyViews`: the views with unsaved changes (`course-views.ts#getDirtyViews`).
 *
 * Emits:
 * - `select(view)`: a view's button was clicked. Listened by `components/course-editor/CourseEditor.vue#template`
 *   (`@select="openView"`).
 *
 * Used by: `components/course-editor/CourseEditor.vue#template` (left of the main area, not while previewing).
 *
 * Uses: UIIcon, UITooltip, `course-views.ts#courseViews` / `#getViewIcon` / `#getViewLabel`.
 */
import { UIIcon, UITooltip } from '@/components/ui'
import { courseViews, getViewIcon, getViewLabel, type CourseView } from './course-views'

defineProps<{
  /** The view on screen. */
  open: CourseView
  /** The views with unsaved changes. */
  dirtyViews: Set<CourseView>
}>()

const emit = defineEmits<{
  /** A view's button was clicked. */
  select: [view: CourseView]
}>()
</script>

<template>
  <nav
    v-radar="{ name: 'course-activity-bar', desc: 'Buttons that switch between the parts of the course' }"
    class="flex w-14 flex-none flex-col border-r border-line bg-grey-100 py-2"
  >
    <UITooltip v-for="view in courseViews" :key="view" placement="right">
      <template #trigger>
        <!-- One row per view: the open one gets the marker on the left edge and the primary colour. -->
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
          <span v-if="view === open" class="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-r bg-primary-main"></span>
          <UIIcon class="h-6 w-6" :type="getViewIcon(view)" />
          <!-- Unsaved changes in this view. -->
          <span
            v-if="dirtyViews.has(view)"
            class="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-primary-main"
          ></span>
        </button>
      </template>
      {{ $t(getViewLabel(view)) }}
    </UITooltip>
  </nav>
</template>
