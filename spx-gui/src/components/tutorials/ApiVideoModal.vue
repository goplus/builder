<!-- The modal playing an API's explainer video, shared by the copilot's `api-video` element and
     the course-opening knowledge-point videos. -->
<script setup lang="ts">
import { UIModal, UIModalClose } from '@/components/ui'
import type { ApiVideoInfo } from './api-videos'

defineProps<{
  video: ApiVideoInfo
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <UIModal
    v-radar="{ name: 'API video modal', desc: 'Modal playing the explainer video of an API' }"
    :visible="visible"
    size="large"
    mask-closable
    @update:visible="emit('close')"
  >
    <div class="flex flex-col px-5 pb-5 pt-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg text-title">{{ $t(video.title) }}</h3>
        <UIModalClose @click="emit('close')" />
      </div>
      <div class="mt-3 overflow-hidden rounded-md bg-grey-1000">
        <video class="block aspect-video w-full" :src="video.src" controls autoplay playsinline></video>
      </div>
    </div>
  </UIModal>
</template>
