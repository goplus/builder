<script setup lang="ts">
/**
 * Purpose: A resource at full size: a video to play, or a picture to look at. For a video it also says how the
 * course program plays it, since that is what its name is for.
 *
 * Props:
 * - `visible`: whether the modal is shown (driven by `useModal`).
 * - `resource`: the resource to show.
 *
 * Emits:
 * - `cancelled`: the author closed it (close button or mask); the modal has nothing to resolve with.
 * - `resolved`: declared for `useModal`; never emitted.
 *
 * Used by: `components/course-editor/CourseResourceGrid.vue#handlePreview` (through `useModal`).
 *
 * Uses: UIModal, UIModalClose, `models/common/cloud#getStoredWebUrl`, `utils/utils#useAsyncComputed`.
 */
import { computed } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import { getStoredWebUrl } from '@/models/common/cloud'
import { videosKind, type Resource } from '@/models/tutorial/resource'
import { UIModal, UIModalClose } from '@/components/ui'

const props = defineProps<{
  visible: boolean
  /** The resource to show. */
  resource: Resource
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

/**
 * Whether this is a video rather than a picture.
 * Read by: `CourseResourcePreviewModal.vue#template`.
 */
const isVideo = computed(() => props.resource.kind === videosKind)

/**
 * Where the file is shown from: where the course stored it when it has, so a video can stream instead of being
 * downloaded first, or the file in memory when it was added since the last save.
 * Read by: `CourseResourcePreviewModal.vue#template`.
 * Called by: Vue (`watchEffect` inside `useAsyncComputed`)
 */
const url = useAsyncComputed(async (onCleanup) => {
  const file = props.resource.file
  return (await getStoredWebUrl(file)) ?? file.url(onCleanup)
})
</script>

<template>
  <UIModal
    :radar="{ name: 'resource-preview-modal', desc: 'Modal showing a video or a picture of the course at full size' }"
    size="large"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <div class="flex flex-col gap-3 px-5 pt-4 pb-5">
      <header class="flex items-center justify-between gap-3">
        <h2 class="m-0 truncate text-lg font-semibold">{{ resource.name }}</h2>
        <UIModalClose @click="emit('cancelled')" />
      </header>
      <p v-if="isVideo" class="m-0 text-sm text-grey-700">
        {{ $t({ en: 'The course program plays it with', zh: '课程程序这样播放它：' }) }}
        <code>showVideo "{{ resource.name }}"</code>
      </p>
      <video
        v-if="isVideo && url != null"
        class="w-full rounded bg-black"
        style="max-height: 70vh"
        :src="url"
        crossorigin="anonymous"
        controls
        autoplay
      ></video>
      <img
        v-else-if="!isVideo && url != null"
        class="mx-auto block max-w-full rounded"
        style="max-height: 70vh"
        :src="url"
        :alt="resource.name"
        crossorigin="anonymous"
      />
    </div>
  </UIModal>
</template>
