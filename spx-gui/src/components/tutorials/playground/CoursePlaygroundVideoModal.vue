<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

import { Cancelled } from '@/utils/exception'
import type { Video } from '@/models/tutorial/video'
import { UIButton, UIError, UIIcon, UILoading, UIModal } from '@/components/ui'

const props = defineProps<{
  visible: boolean
  video: Video
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const videoElement = ref<HTMLVideoElement | null>(null)
const src = ref<string | null>(null)
const failed = ref(false)
const needsPlay = ref(true)
const muted = ref(false)
const controller = new AbortController()

function dismiss() {
  videoElement.value?.pause()
  controller.abort(new Cancelled('Video dismissed'))
  emit('resolved')
}

async function play() {
  const video = videoElement.value
  if (video == null) return
  if (video.ended) video.currentTime = 0
  needsPlay.value = false
  try {
    await video.play()
  } catch {
    needsPlay.value = true
  }
  if (controller.signal.aborted) video.pause()
}

async function load() {
  failed.value = false
  try {
    src.value = await props.video.file.url(controller.signal)
  } catch {
    if (!controller.signal.aborted) failed.value = true
  }
}

onMounted(() => void load())
onBeforeUnmount(() => {
  videoElement.value?.pause()
  controller.abort(new Cancelled('Video unmounted'))
})
</script>

<template>
  <UIModal
    :visible="visible"
    size="large"
    :mask-closable="false"
    :radar="{ name: 'course-video', desc: 'Course-local instructional video' }"
    @update:visible="dismiss"
  >
    <div class="flex flex-col items-center gap-5 p-6">
      <div
        class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-grey-1000"
      >
        <UIError v-if="failed" class="p-6 text-white" :retry="load">
          {{ $t({ en: 'Failed to play the Course video', zh: '课程视频播放失败' }) }}
        </UIError>
        <UILoading v-else-if="src == null" class="p-6" />
        <video
          v-else
          ref="videoElement"
          class="block h-full w-full object-contain"
          :src="src"
          :muted="muted"
          playsinline
          @loadeddata="play"
          @pause="needsPlay = true"
          @ended="needsPlay = true"
          @error="failed = true"
        ></video>
        <button
          v-if="src != null && !failed"
          v-radar="{ name: 'course-video-sound', desc: 'Turn the Course video sound on or off' }"
          type="button"
          class="absolute right-3 top-3 flex size-8 appearance-none items-center justify-center rounded-full border border-solid border-grey-500 bg-grey-100 p-0 text-grey-800 hover:bg-grey-300"
          :aria-label="$t(muted ? { en: 'Turn sound on', zh: '打开声音' } : { en: 'Turn sound off', zh: '关闭声音' })"
          :aria-pressed="!muted"
          @click="muted = !muted"
        >
          <UIIcon :type="muted ? 'volumeOff' : 'volumeUp'" class="size-5" />
        </button>
        <button
          v-if="src != null && needsPlay && !failed"
          v-radar="{ name: 'course-video-play', desc: 'Play or replay the Course video' }"
          type="button"
          class="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 appearance-none items-center justify-center rounded-full border-0 bg-[rgba(36,41,47,0.25)] p-3.5 text-white outline-none transition-colors hover:bg-[rgba(36,41,47,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          :aria-label="$t({ en: 'Play video', zh: '播放视频' })"
          @click="play"
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
