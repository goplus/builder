<script lang="ts">
/**
 * Course authors can play a story video before the course starts by embedding a
 * `<course-story-video>` section in the course prompt, e.g.
 * `<course-story-video>/tutorial-intro/opening.webm</course-story-video>`.
 * Typically only the first course of a series has one, introducing the series' world & goal.
 * The URL is validated against the allowed origins by the caller. The player sizes itself to the
 * video, so the section carries the URL only — no shape to declare or keep in sync.
 */
export function extractCourseStoryVideo(prompt: string): string | null {
  const matched = prompt.match(/<course-story-video>([\s\S]*?)<\/course-story-video>/)
  const src = matched?.[1].trim() ?? ''
  return src === '' ? null : src
}
</script>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { UIButton, UIIcon, UIModal } from '@/components/ui'
import { handlePlayWithSound, useVideoAspect } from './video-aspect'

const props = defineProps<{
  visible: boolean
  /** URL of the story video. */
  src: string
}>()

const emit = defineEmits<{
  /** Emitted when the user finishes or skips the video and the course should start. */
  continue: []
}>()

const hasPlaybackError = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const hasEnded = ref(false)
const hasLoaded = ref(false)
const isPlaying = ref(false)
const isMuted = ref(false)

const showPlayButton = computed(
  () => hasLoaded.value && !hasPlaybackError.value && (!isPlaying.value || hasEnded.value)
)

async function playVideo() {
  const video = videoRef.value
  if (video == null) return
  // Keep sound enabled by default. Browsers that reject unmuted autoplay are handled below by
  // falling back to muted playback; the video remains recoverable through the sound toggle.
  video.defaultMuted = false
  video.muted = isMuted.value
  try {
    await video.play()
  } catch {
    if (!isMuted.value) {
      isMuted.value = true
      video.muted = true
      try {
        await video.play()
      } catch {
        // A user gesture may still be required in some browsers. Keep the modal open and expose
        // the play button instead of leaving the learner on an unexplained frozen first frame.
      }
    }
  }
}

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return
    hasEnded.value = false
    hasPlaybackError.value = false
    hasLoaded.value = false
    isPlaying.value = false
    isMuted.value = false
    void nextTick(() => {
      const video = videoRef.value
      if (video == null) return
      video.defaultMuted = false
      video.muted = false
      void playVideo()
    })
  }
)

onMounted(() => {
  if (props.visible) void playVideo()
})

function handleEnded() {
  hasEnded.value = true
  isPlaying.value = false
}

function handleLoaded() {
  hasLoaded.value = true
}

function handlePlay() {
  isPlaying.value = true
  hasEnded.value = false
}

function handlePause() {
  isPlaying.value = false
}

async function replay() {
  const video = videoRef.value
  if (video == null) return
  hasEnded.value = false
  video.currentTime = 0
  video.muted = isMuted.value
  await handlePlayWithSound({ target: video } as unknown as Event)
  if (video.muted && !isMuted.value) isMuted.value = true
}

async function toggleSound() {
  const video = videoRef.value
  if (video == null) return
  if (isMuted.value) {
    video.muted = false
    try {
      await video.play()
      isMuted.value = false
    } catch {
      video.muted = true
    }
    return
  }
  video.muted = true
  isMuted.value = true
}

// Use the video's intrinsic ratio once metadata is available. The fallback only reserves a
// reasonable loading area; the player itself is never letterboxed inside a fixed-ratio frame.
const { aspectStyle, handleLoadedMetadata } = useVideoAspect(16 / 9)

function handleContinue() {
  emit('continue')
}
</script>

<template>
  <UIModal
    v-radar="{
      name: 'Tutorial story video modal',
      desc: 'Modal showing the story video of the course before it starts'
    }"
    :visible="visible"
    size="large"
    :mask-closable="false"
  >
    <div class="flex flex-col items-center gap-5 p-6">
      <div class="relative w-full overflow-hidden rounded-md bg-grey-1000" :style="aspectStyle">
        <!-- Hover-card style without browser controls popping up on mouse move. The story has a
             plot and a soundtrack, so it starts with sound when the browser permits it; the sound
             button remains available when the browser requires a gesture before unmuting.
             `crossorigin` puts the request in CORS mode so externally-hosted videos (e.g. S3)
             pass the app's `Cross-Origin-Embedder-Policy: require-corp` check. -->
        <video
          ref="videoRef"
          class="block h-full w-full"
          :src="src"
          crossorigin="anonymous"
          autoplay
          playsinline
          preload="auto"
          @loadedmetadata="handleLoadedMetadata"
          @loadeddata="handleLoaded"
          @canplay="handleLoaded"
          @play="handlePlay"
          @pause="handlePause"
          @ended="handleEnded"
          @error="hasPlaybackError = true"
        ></video>
        <button
          type="button"
          class="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-grey-500 bg-grey-100 p-0 text-grey-800 outline-none transition-colors hover:bg-grey-300 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grey-800"
          :aria-label="$t(isMuted ? { en: 'Turn sound on', zh: '打开声音' } : { en: 'Turn sound off', zh: '关闭声音' })"
          :aria-pressed="!isMuted"
          @click="toggleSound"
        >
          <UIIcon :type="isMuted ? 'volumeOff' : 'volumeUp'" class="size-5" />
        </button>
        <button
          v-if="showPlayButton"
          type="button"
          class="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 appearance-none items-center justify-center rounded-full border-0 bg-[rgba(36,41,47,0.25)] p-3.5 text-white outline-none transition-colors hover:bg-[rgba(36,41,47,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          :aria-label="$t({ en: 'Play video', zh: '播放视频' })"
          @click="replay"
        >
          <UIIcon type="play" class="size-7" />
        </button>
        <div
          v-if="hasPlaybackError"
          class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-grey-100 text-text"
        >
          {{ $t({ en: 'The video cannot be played right now.', zh: '视频暂时无法播放。' }) }}
        </div>
      </div>

      <UIButton type="primary" size="large" @click="handleContinue">
        {{ $t({ en: 'Start the course', zh: '开始课程' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
