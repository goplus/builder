<!-- The modal playing an API's explainer video, shared by the copilot's `api-video` element and
     the course-opening knowledge-point videos. -->
<script setup lang="ts">
import { UIModal, UIModalClose } from '@/components/ui'
import type { ApiVideoInfo } from './api-videos'
import { handlePlayWithSound, useVideoAspect } from './video-aspect'

defineProps<{
  video: ApiVideoInfo
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// The library mixes shapes (the newer explainers are 4:3, the older ones 16:9), so the box
// follows each video; 4:3 is the shape videos are produced in now, used until metadata loads.
const { aspectStyle, handleLoadedMetadata } = useVideoAspect(4 / 3)
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
      <!-- No title: the video names the API on its own first line, and the dialog opens as part of
           a course opening where repeating it just adds a line to read. -->
      <div class="flex items-center justify-end">
        <UIModalClose @click="emit('close')" />
      </div>
      <div class="mt-3 overflow-hidden rounded-md bg-grey-1000">
        <!-- Hover-card style minus the muting: autoplaying, looping, no browser controls (they
             would appear on hover otherwise). Unlike the hover card's silent preview, the dialog
             is deliberate viewing, so the soundtrack plays; if the browser blocks unmuted
             autoplay, `handlePlayWithSound` falls back to muted rather than freezing (no controls
             means no way to unstick a paused video).
             `crossorigin` puts the request in CORS mode so externally-hosted videos (e.g. S3)
             pass the app's `Cross-Origin-Embedder-Policy: require-corp` check. -->
        <video
          class="block w-full"
          :style="aspectStyle"
          :src="video.src"
          crossorigin="anonymous"
          autoplay
          loop
          playsinline
          @loadedmetadata="handleLoadedMetadata"
          @loadeddata="handlePlayWithSound"
        ></video>
      </div>
    </div>
  </UIModal>
</template>
