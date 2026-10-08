<script setup lang="ts">
/**
 * A resource at full size: a video to play, or a picture to look at. For a video it also gives the line of course
 * program that plays it, ready to copy, since that is what its name is for.
 */
import { computed } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import { getStoredWebUrl } from '@/models/common/cloud'
import { Video, type Image } from '@/models/tutorial/project'
import { UIModal, UIModalClose } from '@/components/ui'
import CodeView from '@/components/common/CodeView.vue'
import CopyButton from '@/components/common/CopyButton.vue'

const props = defineProps<{
  visible: boolean
  resource: Video | Image
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const isVideo = computed(() => props.resource instanceof Video)

// `JSON.stringify` writes the name as a string literal, so a name holding a quote or a backslash still compiles.
const playCall = computed(() => `showVideo ${JSON.stringify(props.resource.name)}`)

// A stored video streams from where it is stored instead of being downloaded first, as `File.url()` would do.
const videoUrl = useAsyncComputed(async (onCleanup) => {
  if (!isVideo.value) return null
  const file = props.resource.file
  return (await getStoredWebUrl(file)) ?? file.url(onCleanup)
})

const [imageUrl] = useRenderableImageUrl(() => (isVideo.value ? null : props.resource.file))
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
      <div v-if="isVideo" class="flex items-center gap-2 text-sm text-grey-700">
        {{ $t({ en: 'The course program plays it with', zh: '课程程序这样播放它：' }) }}
        <span class="inline-flex items-center gap-1.5 rounded bg-grey-300 py-0.5 pr-1 pl-2">
          <CodeView mode="inline" language="xgo">{{ playCall }}</CodeView>
          <CopyButton :value="playCall" :label="{ en: 'Copy code', zh: '复制代码' }" />
        </span>
      </div>
      <video
        v-if="isVideo && videoUrl != null"
        class="w-full rounded bg-black"
        style="max-height: 70vh"
        :src="videoUrl"
        crossorigin="anonymous"
        controls
        autoplay
      ></video>
      <img
        v-else-if="!isVideo && imageUrl != null"
        class="mx-auto block max-w-full rounded"
        style="max-height: 70vh"
        :src="imageUrl"
        :alt="resource.name"
      />
    </div>
  </UIModal>
</template>
