<script setup lang="ts">
/**
 * One resource on its page, drawn like a course in course management: its picture (for a video, the first frame)
 * filling the card, its name along the bottom, and a menu in the corner that shows on hover.
 */
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import { Video, type Image } from '@/models/tutorial/project'
import { UIDropdown, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

const props = defineProps<{
  resource: Video | Image
}>()

const emit = defineEmits<{
  /** The card was clicked. */
  preview: []
  /** "Rename..." was chosen. */
  rename: []
  /** "Delete..." was chosen. */
  remove: []
}>()

const isVideo = computed(() => props.resource instanceof Video)

// NOTE: The whole video is loaded before its first frame shows, see https://github.com/goplus/builder/issues/3573.
const [videoUrl] = useFileUrl(() => (isVideo.value ? props.resource.file : null))

const [imageUrl] = useRenderableImageUrl(() => (isVideo.value ? null : props.resource.file))
</script>

<template>
  <li
    v-radar="{
      name: 'resource-card',
      desc: 'Click to preview this resource',
      attrs: { name: resource.name, type: isVideo ? 'video' : 'image' }
    }"
    class="group relative box-border aspect-video cursor-pointer overflow-hidden rounded-lg border-2 border-grey-300 bg-grey-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-grey-400 hover:shadow-sm"
    @click="emit('preview')"
  >
    <!-- `#t=0.1` asks for the frame just after the start, which browsers then draw as the poster. -->
    <video
      v-if="isVideo && videoUrl != null"
      class="h-full w-full object-cover"
      :src="`${videoUrl}#t=0.1`"
      preload="metadata"
      muted
      playsinline
    ></video>
    <img
      v-else-if="!isVideo && imageUrl != null"
      class="h-full w-full object-cover"
      :src="imageUrl"
      :alt="resource.name"
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
