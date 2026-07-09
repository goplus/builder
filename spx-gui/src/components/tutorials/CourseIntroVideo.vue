<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

const props = defineProps<{
  src: string
}>()

const emit = defineEmits<{
  continue: []
}>()

const videoRef = useTemplateRef<HTMLVideoElement>('video')
const hasStarted = ref(false)
const hasPlaybackError = ref(false)

async function playVideo() {
  const video = videoRef.value
  if (video == null) return
  try {
    await video.play()
  } catch {
    hasPlaybackError.value = true
  }
}

function handlePlay() {
  hasStarted.value = true
  hasPlaybackError.value = false
}

function continueToCourse() {
  emit('continue')
}
</script>

<template>
  <section class="course-intro-overlay" role="dialog" aria-modal="true">
    <div class="course-intro-dialog">
      <button
        class="course-intro-close"
        type="button"
        :aria-label="$t({ en: 'Skip intro video', zh: '跳过课程介绍视频' })"
        @click="continueToCourse"
      >
        ×
      </button>

      <div class="course-intro-video-frame">
        <video
          ref="video"
          class="course-intro-video"
          :src="props.src"
          controls
          playsinline
          preload="metadata"
          @play="handlePlay"
          @ended="continueToCourse"
          @error="hasPlaybackError = true"
        ></video>

        <button v-if="!hasStarted && !hasPlaybackError" class="course-intro-play" type="button" @click="playVideo">
          <span class="course-intro-play-icon">▶</span>
          <span>{{ $t({ en: 'Play video', zh: '播放视频' }) }}</span>
        </button>

        <div v-if="hasPlaybackError" class="course-intro-error">
          <p>{{ $t({ en: 'The video cannot be played right now.', zh: '视频暂时无法播放。' }) }}</p>
          <button class="course-intro-secondary" type="button" @click="continueToCourse">
            {{ $t({ en: 'Start course', zh: '开始课程' }) }}
          </button>
        </div>
      </div>

      <button class="course-intro-skip" type="button" @click="continueToCourse">
        {{ $t({ en: 'Skip and start', zh: '跳过并开始' }) }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.course-intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgb(15 23 42 / 58%);
}

.course-intro-dialog {
  position: relative;
  width: min(900px, 82vw);
  padding: 16px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: 10px;
  background: var(--ui-color-grey-100);
  box-shadow: 0 20px 56px rgb(15 23 42 / 28%);
}

.course-intro-close {
  position: absolute;
  top: -18px;
  right: -18px;
  z-index: 2;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: 999px;
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-800);
  font-size: 28px;
  line-height: 1;
  box-shadow: 0 6px 16px rgb(15 23 42 / 18%);
}

.course-intro-video-frame {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  background: var(--ui-color-grey-1000);
}

.course-intro-video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background: var(--ui-color-grey-1000);
}

.course-intro-play {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: rgb(15 23 42 / 32%);
  color: var(--ui-color-grey-100);
  font-size: 18px;
  font-weight: 600;
}

.course-intro-play-icon {
  display: flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(255 255 255 / 92%);
  color: var(--ui-color-primary-500);
  font-size: 32px;
  line-height: 1;
}

.course-intro-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-900);
  font-size: 16px;
}

.course-intro-secondary,
.course-intro-skip {
  border: 1px solid var(--ui-color-grey-400);
  border-radius: 6px;
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-900);
  font-size: 14px;
}

.course-intro-secondary {
  height: 36px;
  padding: 0 16px;
}

.course-intro-skip {
  margin-top: 12px;
  height: 34px;
  padding: 0 14px;
}
</style>
