<!-- The modal playing an API's explainer video, shared by the copilot's `api-video` element and
     the course-opening knowledge-point videos. -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { UIIcon, UIModal, UIModalClose } from '@/components/ui'
import type { ApiVideoInfo } from './api-videos'
import { handlePlayWithSound, useVideoAspect } from './video-aspect'

const props = defineProps<{
  video: ApiVideoInfo
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const hasEnded = ref(false)

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return
    hasEnded.value = false
    videoRef.value?.load()
  }
)

function handleEnded() {
  hasEnded.value = true
}

async function replay() {
  const video = videoRef.value
  if (video == null) return
  hasEnded.value = false
  video.currentTime = 0
  await handlePlayWithSound({ target: video } as unknown as Event)
}

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
    <div class="flex flex-col">
      <div class="flex items-center justify-between border-b border-grey-400 px-6 py-3.5">
        <div class="text-base/[26px] font-medium text-grey-1000">
          {{ $t({ en: 'Tutorial guide', zh: '教程引导' }) }}
        </div>
        <UIModalClose @click="emit('close')" />
      </div>
      <div class="px-6 py-5">
        <div class="relative overflow-hidden rounded-md bg-grey-1000">
          <!-- Hover-card style minus the muting: autoplaying once, with no browser controls (they
             would appear on hover otherwise). Unlike the hover card's silent preview, the dialog
             is deliberate viewing, so the soundtrack plays; if the browser blocks unmuted
             autoplay, `handlePlayWithSound` falls back to muted rather than freezing (no controls
             means no way to unstick a paused video).
             `crossorigin` puts the request in CORS mode so externally-hosted videos (e.g. S3)
             pass the app's `Cross-Origin-Embedder-Policy: require-corp` check. -->
          <video
            ref="videoRef"
            class="block w-full"
            :style="aspectStyle"
            :src="video.src"
            crossorigin="anonymous"
            autoplay
            playsinline
            @loadedmetadata="handleLoadedMetadata"
            @loadeddata="handlePlayWithSound"
            @ended="handleEnded"
          ></video>
          <button
            v-if="hasEnded"
            type="button"
            class="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 appearance-none items-center justify-center rounded-full border-0 bg-[rgba(36,41,47,0.25)] p-3.5 text-white outline-none transition-colors hover:bg-[rgba(36,41,47,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            :aria-label="$t({ en: 'Play video', zh: '播放视频' })"
            @click="replay"
          >
            <UIIcon type="play" class="size-7" />
          </button>
        </div>
      </div>
    </div>
  </UIModal>
</template>
