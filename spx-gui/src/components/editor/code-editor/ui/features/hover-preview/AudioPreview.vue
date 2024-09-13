<script setup lang="ts">
import { useAsyncComputed } from '@/utils/utils'
import { getAudioContext } from '@/utils/audio'
import { computed, ref, watchEffect } from 'vue'
import IconPlay from '../../icons/play.svg?raw'
import IconPause from '../../icons/pause.svg?raw'
import IconReset from '../../icons/reset.svg?raw'
import { normalizeIconSize } from '@/components/editor/code-editor/ui/common'

const props = defineProps<{
  src: string
}>()

const audioElement = ref<HTMLAudioElement>()
const isPlaying = ref(false)
const duration = ref(0)
const currentTime = ref(0)
const progress = ref(0)

const waveformDataFromSrc = useAsyncComputed(async () => {
  const audioContext = getAudioContext()
  const arrayBuffer = await (await fetch(props.src)).arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  const channelData = audioBuffer.getChannelData(0)

  // First, we group the data into blocks by a fixed block size of 128 samples
  // to match the behavior of the recorder.
  // TODO: This could potentially be optimized by some math, or just omitted
  const preProcessedData = new Array<number>(Math.floor(channelData.length / 128))
  for (let i = 0; i < preProcessedData.length; i++) {
    let sum = 0
    for (let j = 0; j < 128; j++) {
      sum += Math.abs(channelData[i * 128 + j])
    }
    preProcessedData[i] = sum / 128
  }

  // We want the final waveform to have a length of about 36 points.
  const targetPointLength = 36
  // We use floor(x / 20) * 20 to make the block size a multiple of 20.
  // Thus it changes less frequently and the waveform is more stable.
  const blockSize = Math.max(Math.floor(preProcessedData.length / targetPointLength), 1)

  const points = new Array<number>(targetPointLength)
  // here is new code
  let maxPointValue = 0
  for (let i = 0; i < targetPointLength; i++) {
    let sum = 0
    for (let j = 0; j < blockSize; j++) {
      const index = i * blockSize + j
      if (index < preProcessedData.length) {
        sum += preProcessedData[index]
      }
    }
    points[i] = sum / blockSize
    if (points[i] > maxPointValue) {
      maxPointValue = points[i]
    }
  }

  for (let i = 0; i < targetPointLength; i++) {
    points[i] = (points[i] / maxPointValue) * 100
  }

  return points
})
const formatDuration = computed(() => {
  return `${currentTime.value.toFixed(2)}/${duration.value}s`
})

watchEffect((onCleanup) => {
  if (!audioElement.value) return
  const audio = audioElement.value

  const handleTimeupdate = () => {
    duration.value = audio.duration
    currentTime.value = audio.currentTime

    progress.value = Math.round((audio.currentTime / audio.duration) * 100)
  }

  const handleError = (e: ErrorEvent) => {
    console.warn(e)
    isPlaying.value = false
  }

  const handleEnded = () => {
    isPlaying.value = false
  }

  audio.addEventListener('timeupdate', handleTimeupdate)
  audio.addEventListener('ended', handleEnded)
  audio.addEventListener('error', handleError)

  onCleanup(() => {
    audio.removeEventListener('timeupdate', handleTimeupdate)
    audio.removeEventListener('ended', handleEnded)
    audio.removeEventListener('error', handleError)
  })
})

function playAudio() {
  if (!audioElement.value) return
  if (isPlaying.value) return
  isPlaying.value = true
  audioElement.value.play()
}

function pauseAudio() {
  if (!audioElement.value) return
  if (!isPlaying.value) return
  isPlaying.value = false
  audioElement.value.pause()
}

function resetAudio() {
  if (!audioElement.value) return
  pauseAudio()
  audioElement.value.currentTime = 0
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="audio-player">
    <audio ref="audioElement" :src="src"></audio>
    <aside class="play-button" @click="isPlaying ? pauseAudio() : playAudio()">
      <span
        v-if="isPlaying"
        :ref="(element) => normalizeIconSize(element as Element, 21, 25)"
        v-html="IconPause"
      ></span>
      <span
        v-else
        :ref="(element) => normalizeIconSize(element as Element, 21, 25)"
        v-html="IconPlay"
      ></span>
    </aside>

    <main class="audio-wrapper">
      <!--  this layer is for audio wave  -->
      <section class="audio-wave">
        <span
          v-for="(point, i) in waveformDataFromSrc"
          :key="i"
          class="wave-bar"
          :style="{ height: `${point}%` }"
        ></span>
      </section>
      <!--  this layer is for progress  -->
      <section
        class="progress"
        :style="{
          transform: `translateX(${progress}%)`
        }"
      ></section>
      <!--  this layer is for extras like duration, reset button  -->
      <nav class="extra">
        <span class="duration">{{ formatDuration }}</span>
        <span
          :ref="(element) => normalizeIconSize(element as Element, 12)"
          class="reset"
          @click="resetAudio"
          v-html="IconReset"
        ></span>
      </nav>
    </main>
  </div>
</template>
<style lang="scss" scoped>
// this component will append to body not in #app, some css variable is not available
.audio-player {
  overflow: hidden;
  display: flex;
  align-items: center;
  height: 62px;
  width: 320px;
  border-radius: 5px;
  border: 1px solid #a6a6a6;
}

.audio-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 4px;
}

.play-button {
  cursor: pointer;
  flex-shrink: 1;
  padding: 10px 4px 10px 10px;
  transition: 0.3s;

  &:active {
    transform: scale(0.8);
  }
}

.audio-wave {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 4px;

  .wave-bar {
    display: inline-flex;
    width: 4px;
    background-color: black;
    border-radius: 999px;
  }
}

.progress {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.1);
  transition: 0.25s linear;

  &::before {
    content: '';
    display: inline-block;
    width: 2px;
    height: 100%;
    background-color: #2a82e4;
  }
}

.extra {
  user-select: none;
  display: flex;
  align-items: center;
  position: absolute;
  top: 0;
  right: 0;
  padding-right: 4px;

  .duration {
    margin-right: 4px;
    font-size: 12px;
    font-family: 'JetBrains Mono NL', Consolas, 'Courier New', 'AlibabaHealthB', monospace;
  }

  .reset {
    cursor: pointer;
  }
}
</style>
