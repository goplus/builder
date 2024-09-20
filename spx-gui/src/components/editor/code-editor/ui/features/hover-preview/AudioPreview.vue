<script setup lang="ts">
import { useAsyncComputed } from '@/utils/utils'
import { getAudioContext, useAudioDuration } from '@/utils/audio'
import { computed, ref, watchEffect } from 'vue'
import IconPlay from '../../icons/play.svg?raw'
import IconPause from '../../icons/pause.svg?raw'
import IconReset from '../../icons/reset.svg?raw'
import { normalizeIconSize } from '@/components/editor/code-editor/ui/common'
import { useFileUrl } from '@/utils/file'
import { File } from '@/models/common/file'

const emits = defineEmits<{
  playing: []
  ended: []
}>()

const props = defineProps<{
  file: File
}>()

const audioElement = ref<HTMLAudioElement>()
const progressElement = ref<HTMLElement>()
const progressMaskElement = ref<HTMLElement>()

const isPlaying = ref(false)
const duration = ref(0)
const currentTime = ref(0)
const progress = ref(0)
// todo: reused buffer data by `waveformDataFromSrc` computed functions
// this url is already in blob:http://host:xxx-xxxx-xxx-xx reuse data or keep it in url depends on you
const [audioSrc, audioLoading] = useFileUrl(() => props.file)
const { formattedDuration } = useAudioDuration(() => audioSrc.value)
// this function is from current project 'src/components/editor/sound/waveform/WaveformPlayer.vue'
const waveformDataFromSrc = useAsyncComputed(async () => {
  if (!audioSrc.value) return
  const audioContext = getAudioContext()
  const arrayBuffer = await (await fetch(audioSrc.value)).arrayBuffer()
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

  // 36 is current component custom number, you can change this number with changing component css width property.
  // We want the final waveform to have a length of about 36 points.
  const targetPointLength = 36
  // We use floor(x / 20) * 20 to make the block size a multiple of 20.
  // Thus it changes less frequently and the waveform is more stable.
  const blockSize = Math.max(Math.floor(preProcessedData.length / targetPointLength), 1)

  const points = new Array<number>(targetPointLength)
  // here is new code!
  let maxPointValue = 0
  // this loop is to find max pointData
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

  // update raw points to percent for css height style height: 'xx.xx%'
  for (let i = 0; i < targetPointLength; i++) {
    points[i] = (points[i] / maxPointValue) * 100
  }

  return points
})
const formatRemain = computed(() => {
  const remainTime = duration.value - currentTime.value
  if (!isPlaying.value) return formattedDuration.value
  return isNaN(remainTime) ? '0.0s' : `${remainTime.toFixed(1)}s`
})

watchEffect((onCleanup) => {
  if (!audioElement.value) return
  const audio = audioElement.value
  const handleTimeupdate = () => {
    emits('playing')
    duration.value = audio.duration
    currentTime.value = audio.currentTime

    progress.value = Math.round((audio.currentTime / audio.duration) * 100)
  }

  const handleError = (e: ErrorEvent) => {
    emits('ended')
    console.warn(e)
    isPlaying.value = false
  }

  const handleEnded = () => {
    emits('ended')
    resetAudio()
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
  if (!audioElement.value || !progressElement.value || !progressMaskElement.value) return
  if (!isPlaying.value && !progress.value) return
  pauseAudio()
  audioElement.value.currentTime = 0
  progressElement.value.style.animation = 'none'
  progressMaskElement.value.style.animation = 'none'
  // this line will trigger reflow
  progressElement.value.offsetHeight
  progressMaskElement.value.offsetHeight
  // after reflow, we can reset animation by setting empty to be able to replay animation
  progressElement.value.style.animation = ''
  progressMaskElement.value.style.animation = ''
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="audio-player">
    <audio v-if="audioSrc" ref="audioElement" :src="audioSrc"></audio>
    <aside class="play-button" @click="isPlaying ? pauseAudio() : playAudio()">
      <span
        v-if="isPlaying"
        :ref="(element) => normalizeIconSize(element as Element, 21, 25)"
        class="pause"
        v-html="IconPause"
      ></span>
      <span
        v-else
        :ref="(element) => normalizeIconSize(element as Element, 21, 25)"
        class="play"
        v-html="IconPlay"
      ></span>
    </aside>

    <main class="audio-wrapper">
      <template v-if="audioLoading">
        <section class="audio-wave audio-wave-loading">
          <span
            v-for="idx in 36"
            :key="idx"
            class="wave-bar"
            :style="{
              '--delay': idx * 50 + 'ms'
            }"
          ></span>
        </section>
      </template>
      <template v-else>
        <!--  this layer is for audio wave  -->
        <section class="audio-wave">
          <span
            v-for="(point, i) in waveformDataFromSrc"
            :key="i"
            class="wave-bar"
            :style="{ height: `${point}%` }"
          ></span>
          <span
            ref="progressMaskElement"
            :style="{
              animationPlayState: isPlaying ? 'running' : 'paused'
            }"
            class="progress-mask"
          ></span>
        </section>
        <!--  this layer is for progress  -->
        <section
          ref="progressElement"
          class="progress"
          :style="{
            animationPlayState: isPlaying ? 'running' : 'paused'
          }"
        ></section>
      </template>

      <!--  this layer is for extras like duration, reset button  -->
      <nav class="extra">
        <span class="duration">{{ formatRemain }}</span>
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
  color: black;
  border-radius: 5px;
  border: 1px solid #a6a6a6;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.audio-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 4px 0 4px 4px;
}

.play-button {
  cursor: pointer;
  flex-shrink: 1;
  padding: 10px 6px 10px 10px;
  transition: 0.15s;

  &:active {
    transform: scale(0.8);
  }

  .pause,
  .play {
    display: inline-flex;
    vertical-align: middle;
  }
}

.audio-wave {
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 4px 16px 4px 4px;

  .progress-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    // no compatible problem, this css property minimum chrome support version is 41(2015), lower than wasm support version 57(2017)
    // https://caniuse.com/?search=mix-blend-mode
    mix-blend-mode: soft-light;
    animation: progress-linear calc(v-bind(duration) * 1s) linear;
  }

  .wave-bar {
    overflow: hidden;
    display: inline-block;
    position: relative;
    width: 4px;
    min-height: 4px;
    background-color: #383838;
    border-radius: 999px;
  }
}

.audio-wave-loading {
  .wave-bar {
    background-color: #787878;
    animation: wave-bar-loading 1200ms var(--delay) infinite;
  }

  @keyframes wave-bar-loading {
    0%,
    100% {
      height: 10%;
    }

    50% {
      height: 80%;
    }
  }
}

.progress {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.1);
  animation: progress-linear calc(v-bind(duration) * 1s) linear;

  &::before {
    content: '';
    display: inline-block;
    width: 2px;
    height: 100%;
    background-color: #2a82e4;
  }
}

@keyframes progress-linear {
  from {
    transform: translateX(0);
  }

  to {
    // 2px means pseudo-element width
    transform: translateX(calc(100% + 2px));
  }
}

.extra {
  user-select: none;
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  padding-right: 4px;

  .duration {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 12px;
    font-family: 'JetBrains Mono NL', Consolas, 'Courier New', 'AlibabaHealthB', monospace;
  }

  .reset {
    position: absolute;
    right: 2px;
    bottom: 2px;
    cursor: pointer;
  }
}
</style>
