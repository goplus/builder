<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

import { Cancelled } from '@/utils/exception'
import type { Video } from '@/models/tutorial/video'
import { UIButton, UIError, UIIcon, UILoading, UIModal } from '@/components/ui'

const props = defineProps<{
  visible: boolean
  active?: boolean
  video: Video
  signal: AbortSignal
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const videoElement = ref<HTMLVideoElement | null>(null)
const src = ref<string | null>(null)
const failed = ref(false)
const needsPlay = ref(false)
const aspectRatio = ref(4 / 3)
const dismissed = ref(false)
const controller = new AbortController()

function dismiss() {
  if (dismissed.value) return
  dismissed.value = true
  videoElement.value?.pause()
  controller.abort(new Cancelled('Video dismissed'))
  emit('resolved')
}

async function play() {
  const video = videoElement.value
  if (video == null) return
  needsPlay.value = false
  video.muted = false
  try {
    await video.play()
  } catch {
    video.muted = true
    try {
      await video.play()
    } catch {
      needsPlay.value = true
    }
  }
  if (dismissed.value) video.pause()
}

async function load() {
  failed.value = false
  try {
    src.value = await props.video.file.url(controller.signal)
    await nextTick()
    videoElement.value?.load()
  } catch {
    if (!controller.signal.aborted) failed.value = true
  }
}

function handleMetadata() {
  const video = videoElement.value
  if (video != null && video.videoHeight > 0) aspectRatio.value = video.videoWidth / video.videoHeight
}

async function replay() {
  if (videoElement.value == null) return
  videoElement.value.currentTime = 0
  await play()
}

onMounted(() => {
  if (props.signal.aborted) dismiss()
  else {
    props.signal.addEventListener('abort', dismiss, { once: true })
    void load()
  }
})
onUnmounted(() => {
  props.signal.removeEventListener('abort', dismiss)
  videoElement.value?.pause()
  controller.abort(new Cancelled('Video unmounted'))
})
</script>

<template>
  <UIModal
    :visible="visible && !dismissed"
    :active="active"
    size="large"
    :mask-closable="false"
    :radar="{ name: 'course-video', desc: 'Course-local instructional video' }"
    @update:visible="dismiss"
  >
    <div class="flex flex-col items-center gap-5 p-6">
      <div class="relative w-full overflow-hidden rounded-md bg-grey-1000">
        <UIError v-if="failed" class="p-6 text-white" :retry="load">
          {{ $t({ en: 'Failed to play the Course video', zh: '课程视频播放失败' }) }}
        </UIError>
        <UILoading v-else-if="src == null" class="p-6" />
        <video
          v-else
          ref="videoElement"
          class="block w-full"
          :style="{ aspectRatio }"
          :src="src"
          autoplay
          muted
          playsinline
          @loadedmetadata="handleMetadata"
          @loadeddata="play"
          @ended="needsPlay = true"
          @error="failed = true"
        ></video>
        <button
          v-if="needsPlay && !failed"
          v-radar="{ name: 'course-video-play', desc: 'Play or replay the Course video' }"
          type="button"
          class="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/50"
          :aria-label="$t({ en: 'Play video', zh: '播放视频' })"
          @click="replay"
        >
          <UIIcon type="play" class="size-7" />
        </button>
      </div>
      <UIButton
        v-radar="{ name: 'course-continue', desc: 'Close the video and continue the Course' }"
        size="large"
        @click="dismiss"
      >
        {{ $t({ en: 'Continue', zh: '继续' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
