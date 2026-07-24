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
import { ref } from 'vue'

import { UIButton, UIModal, UIModalClose } from '@/components/ui'
import { useVideoAspect } from './video-aspect'

defineProps<{
  visible: boolean
  /** URL of the story video. */
  src: string
}>()

const emit = defineEmits<{
  /** Emitted when the user finishes or skips the video and the course should start. */
  continue: []
}>()

const hasPlaybackError = ref(false)

// Series intros differ in shape, so the box follows the video; 16:9 is what they have been so far.
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
    <div class="flex flex-col px-5 pt-4 pb-5">
      <div class="flex justify-end">
        <UIModalClose @click="handleContinue" />
      </div>

      <div class="relative mt-3 overflow-hidden rounded-md bg-grey-1000">
        <!-- `crossorigin` puts the request in CORS mode so externally-hosted videos (e.g. S3)
             pass the app's `Cross-Origin-Embedder-Policy: require-corp` check. -->
        <video
          class="block w-full"
          :style="aspectStyle"
          :src="src"
          crossorigin="anonymous"
          controls
          playsinline
          preload="metadata"
          @loadedmetadata="handleLoadedMetadata"
          @ended="handleContinue"
          @error="hasPlaybackError = true"
        ></video>
        <div
          v-if="hasPlaybackError"
          class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-grey-100 text-text"
        >
          {{ $t({ en: 'The video cannot be played right now.', zh: '视频暂时无法播放。' }) }}
        </div>
      </div>

      <UIButton class="mt-5 self-center" type="neutral" size="large" @click="handleContinue">
        {{ $t({ en: 'Skip and start the course', zh: '跳过并开始课程' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
