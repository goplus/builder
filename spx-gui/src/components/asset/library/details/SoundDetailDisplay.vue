<template>
  <div class="container">
    <div class="sound-container">
      <div v-if="audioUrl && !audioLoading" class="sound-preview">
        <audio
          ref="audioElement"
          :src="audioUrl"
          preload="auto"
          hidden
          @timeupdate="updateProgress"
          @loadedmetadata="handleAudioLoaded"
        />
        <div ref="waveformContainer" class="waveform-container">
          <WaveformDisplay
            v-if="waveformData"
            ref="waveform"
            class="waveform"
            :points="waveformData.data"
            :scale="gain"
            :draw-padding-right="waveformData.paddingRight"
            :style="{
              transform: `translateX(-${wavePosition}px)`,
              width: `${(1 / visiblePercent) * 100}%`
            }"
          />
          <div
            class="progress-cursor"
            :style="{
              transform: `translateX(${cursorPosition * (waveformContainer?.clientWidth ?? 0)}px)`
            }"
          ></div>
          <PreviewController
            class="preview-controller"
            @zoom-in="handleZoomIn"
            @zoom-out="handleZoomOut"
            @fit="handleFit"
          />
        </div>
        <div class="sound-play-controller">
          <DumbSoundPlayer
            class="dumb-sound-player"
            :playing="playing"
            :progress="progress"
            color="primary"
            :play-handler="handlePlay"
            :loading="audioLoading"
            @stop="handlePlay"
          />
          <VolumeSlider v-model:value="volume" />
          <div class="spacer" style="flex: 1" />
          <div class="time-display">{{ displayTime(current) }} / {{ displayTime(duration) }}</div>
        </div>
      </div>
      <UILoading v-else class="sound-preview-loading" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { AssetData, AssetType } from '@/apis/asset'
import DumbSoundPlayer from '@/components/editor/sound/DumbSoundPlayer.vue'
import VolumeSlider from '@/components/editor/sound/VolumeSlider.vue'
import WaveformDisplay from '@/components/editor/sound/waveform/WaveformDisplay.vue'
import { getWaveformData } from '@/components/editor/sound/waveform/WaveformPlayer.vue'
import { UILoading } from '@/components/ui'
import { cachedConvertAssetData } from '@/models/common/asset'
import { getAudioContext } from '@/utils/audio'
import { useFileUrl } from '@/utils/file'
import { useAsyncComputed } from '@/utils/utils'
import { throttle } from 'lodash'
import { computed, ref } from 'vue'
import PreviewController from './PreviewController.vue'

const gain = ref(0.5)
const props = defineProps<{
  asset: AssetData<AssetType.Sound>
}>()

const waveformContainer = ref<HTMLDivElement | null>(null)
const waveform = ref<HTMLDivElement | null>(null)

const sound = useAsyncComputed(() => {
  return cachedConvertAssetData(props.asset)
})

const [audioUrl, audioLoading] = useFileUrl(() => sound.value?.file)

const audioElement = ref<HTMLAudioElement | null>(null)

const playing = ref(false)
const current = ref(0)
const duration = ref(0)
const progress = computed(() => current.value / (duration.value || 1))
const volume = ref(1)

const scale = ref(0)
const scaleRate = 0.2

const visiblePercent = computed(() => {
  return Math.exp(-scaleRate * scale.value)
})
const visibleDuration = computed(() => {
  return duration.value * visiblePercent.value
})

const visiblePoints = ref(512)
const pointsRate = computed(() => visiblePoints.value / visibleDuration.value)

const audioBuffer = useAsyncComputed(async () => {
  if (!audioUrl.value) return null
  const audioContext = getAudioContext()
  const arrayBuffer = await fetch(audioUrl.value).then((res) => res.arrayBuffer())
  return await audioContext.decodeAudioData(arrayBuffer)
})

const waveformData = computed(() => {
  if (!audioBuffer.value) return null
  const targetPoints = Math.floor(audioBuffer.value.duration * pointsRate.value)
  return getWaveformData(audioBuffer.value, targetPoints)
})

const cursorPosition = computed(() => {
  if (current.value < visibleDuration.value / 2) {
    return current.value / visibleDuration.value
  }
  if (current.value > duration.value - visibleDuration.value / 2) {
    return 1 - (duration.value - current.value) / visibleDuration.value
  }
  return 0.5
})

const wavePosition = computed(() => {
  const containerWidth = waveformContainer.value?.clientWidth ?? 0
  const waveformWidth = containerWidth / visiblePercent.value
  if (current.value < visibleDuration.value / 2) {
    return 0
  }
  if (current.value > duration.value - visibleDuration.value / 2) {
    return (waveformWidth - containerWidth)
  }
  return (current.value - visibleDuration.value / 2) / duration.value * waveformWidth
})

const handleZoomIn = () => {
  scale.value += 1
}

const handleZoomOut = () => {
  if (scale.value <= 1) {
    handleFit()
    return
  }
  scale.value -= 1
}

const handleFit = () => {
  scale.value = 0
}

const handleAudioLoaded = () => {
  if (!audioElement.value) return
  duration.value = audioElement.value.duration
  scale.value = 0
  current.value = 0
}

const handlePlay = async () => {
  if (playing.value) {
    audioElement.value?.pause()
    playing.value = false
  } else {
    audioElement.value?.play()
    playing.value = true
  }
}

const autoUpdateProgress = () => {
  if (playing.value) {
    current.value += 0.05
  }
  setTimeout(autoUpdateProgress, 50)
}
autoUpdateProgress()

const updateProgress = throttle(() => {
  if (!audioElement.value) return
  current.value = audioElement.value.currentTime
}, 500)

const displayTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.container {
  --container-width: 95%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sound-container {
  width: var(--container-width);
  height: 0;
  overflow: visible;
  padding-bottom: calc(var(--container-width) * 0.5625);
  position: relative;
}

.sound-preview,
.sound-preview-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
}

.sound-preview {
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .waveform-container {
    background: var(--ui-color-grey-300, #f6f8fa);
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .waveform {
    width: 100%;
    height: 100%;
    transition: transform 0.2s linear;
  }

  .progress-cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: var(--ui-color-primary-500);
    transition: transform 0.2s linear;
    pointer-events: none;
  }

  .preview-controller {
    position: absolute;
    bottom: 10px;
    right: 10px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .waveform-container:hover .preview-controller {
    opacity: 1;
  }

  .sound-play-controller {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 10px 16px;
    gap: 10px;

    .dumb-sound-player {
      width: 50px;
      height: 50px;
    }

    .volume-slider {
      width: 30%;
    }
  }
}
</style>
