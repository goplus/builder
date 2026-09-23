<script setup lang="ts">
/**
 * Purpose: One resource on its kind's page, drawn like a course in course management: its picture (for a video, the
 * first frame) filling the card, its name along the bottom, and a menu in the corner that shows on hover. Clicking
 * the card asks for a preview; the menu renames or deletes the resource.
 *
 * Props:
 * - `resource`: the resource the card stands for.
 *
 * Emits (all listened by `components/course-editor/CourseResourceGrid.vue#template`):
 * - `preview`: the card was clicked.
 * - `rename`: "Rename..." was chosen in the menu.
 * - `remove`: "Delete..." was chosen in the menu.
 *
 * Used by: `components/course-editor/CourseResourceGrid.vue#template` (one per resource of the page's kind).
 *
 * Uses: UIDropdown / UIMenu / UIMenuGroup / UIMenuItem, UIIcon, `models/common/cloud#getStoredWebUrl`,
 * `utils/utils#useAsyncComputed`.
 */
import { computed } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import { getStoredWebUrl } from '@/models/common/cloud'
import { videosKind, type Resource } from '@/models/tutorial/resource'
import { UIDropdown, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

const props = defineProps<{
  /** The resource the card stands for. */
  resource: Resource
}>()

const emit = defineEmits<{
  /** The card was clicked. */
  preview: []
  /** "Rename..." was chosen. */
  rename: []
  /** "Delete..." was chosen. */
  remove: []
}>()

/**
 * Whether the card shows a video (its first frame) rather than a picture.
 * Read by: `CourseResourceCard.vue#template`.
 */
const isVideo = computed(() => props.resource.kind === videosKind)

/**
 * Where the card's picture comes from. A file the course has already stored is shown from where it is stored, so a
 * video's first frame costs a few range requests instead of the whole video; a file added since, and not saved yet,
 * is in memory anyway. Null while it is being worked out.
 * Read by: `CourseResourceCard.vue#template`.
 * Called by: Vue (`watchEffect` inside `useAsyncComputed`; re-run when the resource's file changes)
 */
const url = useAsyncComputed(async (onCleanup) => {
  const file = props.resource.file
  return (await getStoredWebUrl(file)) ?? file.url(onCleanup)
})
</script>

<template>
  <li
    v-radar="{
      name: 'resource-card',
      desc: 'Click to preview this resource',
      attrs: { name: resource.name, kind: resource.kind }
    }"
    class="group relative box-border aspect-video cursor-pointer overflow-hidden rounded-lg border-2 border-grey-300 bg-grey-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-grey-400 hover:shadow-sm"
    @click="emit('preview')"
  >
    <!-- The app is cross-origin isolated, so a stored file is only let in when requested with CORS
         (`crossorigin`). `#t=0.1` asks for the frame just after the start, which browsers then draw as the poster. -->
    <video
      v-if="isVideo && url != null"
      class="h-full w-full object-cover"
      :src="`${url}#t=0.1`"
      crossorigin="anonymous"
      preload="metadata"
      muted
      playsinline
    ></video>
    <img
      v-else-if="!isVideo && url != null"
      class="h-full w-full object-cover"
      :src="url"
      :alt="resource.name"
      crossorigin="anonymous"
    />
    <!-- A video reads as one even before its frame has arrived. -->
    <div v-if="isVideo" class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <UIIcon class="h-10 w-10 text-grey-100 opacity-80" type="playCircle" />
    </div>
    <div
      class="absolute bottom-0 box-border w-full truncate bg-grey-1000/30 px-3 text-base/9 text-grey-100"
      :title="resource.name"
    >
      {{ resource.name }}
    </div>
    <!-- Corner menu, shown while the card is hovered. -->
    <div
      class="invisible absolute top-2 right-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100"
    >
      <UIDropdown trigger="click" placement="bottom-end">
        <template #trigger>
          <div
            v-radar="{
              name: 'resource-card-menu',
              desc: 'Click to rename or delete this resource',
              attrs: { name: resource.name }
            }"
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-grey-100 text-grey-800 transition-all duration-100 hover:bg-primary-main hover:text-grey-100"
            @click.stop.prevent
          >
            <UIIcon class="h-5.25 w-5.25" type="more" />
          </div>
        </template>
        <UIMenu>
          <UIMenuGroup>
            <UIMenuItem
              v-radar="{ name: 'rename-menu-item', desc: 'Click to rename this resource' }"
              @click="emit('rename')"
            >
              {{ $t({ en: 'Rename...', zh: '重命名...' }) }}
            </UIMenuItem>
          </UIMenuGroup>
          <UIMenuGroup>
            <UIMenuItem
              v-radar="{ name: 'delete-menu-item', desc: 'Click to delete this resource' }"
              @click="emit('remove')"
            >
              {{ $t({ en: 'Delete...', zh: '删除...' }) }}
            </UIMenuItem>
          </UIMenuGroup>
        </UIMenu>
      </UIDropdown>
    </div>
  </li>
</template>
