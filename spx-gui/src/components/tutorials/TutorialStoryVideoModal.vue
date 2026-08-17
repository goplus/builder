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

import { UIButton, UIIcon, UIModal, UIModalClose } from '@/components/ui'
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

const showPlayButton = computed(
  () => hasLoaded.value && !hasPlaybackError.value && (!isPlaying.value || hasEnded.value)
)

async function playVideo() {
  const video = videoRef.value
  if (video == null) return
  // Set the properties as well as the HTML attributes. This matters after `load()`, and makes
  // the muted fallback explicit for browsers that enforce autoplay policy through the property.
  video.defaultMuted = true
  video.muted = true
  try {
    await video.play()
  } catch {
    // A user gesture may still be required in some browsers. Keep the modal open and expose the
    // play button instead of leaving the learner on an unexplained frozen first frame.
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
    void nextTick(() => {
      const video = videoRef.value
      if (video == null) return
      video.defaultMuted = true
      video.muted = true
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
  await handlePlayWithSound({ target: video } as unknown as Event)
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
    mask-closable
    @update:visible="handleContinue"
  >
    <div class="flex flex-col">
      <div class="flex items-center justify-between border-b border-grey-400 px-6 py-3.5">
        <div class="text-base/[26px] font-medium text-grey-1000">
          {{ $t({ en: 'Tutorial guide', zh: '教程引导' }) }}
        </div>
        <UIModalClose @click="handleContinue" />
      </div>

      <div class="flex flex-col items-center px-6 py-5">
        <div class="relative w-full overflow-hidden rounded-md bg-grey-1000" :style="aspectStyle">
          <!-- Hover-card style minus the muting: autoplaying once, with no browser controls popping
             up on mouse move. The story has a plot and a soundtrack, so it plays with sound;
             `playVideo` uses muted autoplay for browser compatibility. Once playback is paused or
             ends, the overlay play button gives the learner a recovery/replay action.
             `crossorigin` puts the request in CORS mode so externally-hosted videos (e.g. S3)
             pass the app's `Cross-Origin-Embedder-Policy: require-corp` check. -->
          <video
            ref="videoRef"
            class="block h-full w-full"
            :src="src"
            crossorigin="anonymous"
            autoplay
            muted
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

        <UIButton class="mt-5" type="neutral" size="large" @click="handleContinue">
          {{ $t({ en: 'Start the course', zh: '开始课程' }) }}
        </UIButton>
      </div>
    </div>
  </UIModal>
</template>
