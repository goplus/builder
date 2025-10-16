<template>
  <WaveformWithControls
    :waveform-data="waveformDataFromSrc?.data || props.customWaveformData?.data || []"
    :draw-padding-right="
      waveformDataFromSrc ? waveformDataFromSrc.paddingRight : props.customWaveformData?.paddingRight
    "
    :gain="gain"
    :progress="progress"
    :range="range"
    @update:range="emit('update:range', $event)"
    @request-play="play()"
  />
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import WaveformWithControls from './WaveformWithControls.vue'
import { getAudioContext, trimAndApplyGainToWavBlob } from '@/utils/audio'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { registerPlayer } from '@/utils/player-registry'

const props = defineProps<{
  audioSrc?: string
  customWaveformData?: { data: number[]; paddingRight: number }
  range: { left: number; right: number }
  gain: number
}>()

const registered = registerPlayer(stop)

const play = async () => {
  if (!audioElement.value) return
  if (!Number.isFinite(audioElement.value.duration)) {
    console.warn('audio duration is invalid. Started from the beginning.')
    // This can happen when the audio is not loaded yet.
    audioElement.value.currentTime = 0
    await audioElement.value.play()
    return
  }
  audioElement.value.currentTime = audioElement.value.duration * props.range.left
  registered.onStart()
  await audioElement.value.play()
  emit('play')
}

function stop() {
  if (!audioElement.value) return
  audioElement.value.pause()
  audioElement.value.currentTime = Number.isFinite(audioElement.value.duration)
    ? audioElement.value.duration * props.range.left
    : 0
  progress.value = 0
  registered.onStopped()
}

defineExpose({
  play,
  stop,
  exportWav: async (): Promise<Blob> => {
    if (!props.audioSrc) throw new Error('audioSrc is not provided')
    const audio = audioElement.value
    if (!audio) throw new Error('audio element is not ready')
    const audioContext = getAudioContext()
    const arrayBuffer = await (await fetch(props.audioSrc)).arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const wavBlob = await trimAndApplyGainToWavBlob(audioBuffer, props.range.left, props.range.right, props.gain)
    return wavBlob
  }
})

const emit = defineEmits<{
  play: []
  stop: []
  progress: [progress: number]
  'update:range': [range: { left: number; right: number }]
}>()

const audioElement = ref<HTMLAudioElement | null>(null)
const gainNode = ref<GainNode | null>(null)
const progress = ref<number>(0) // 0-1

watch(
  () => props.gain,
  (newValue) => {
    if (!gainNode.value) return
    gainNode.value.gain.value = newValue
  }
)

watch(
  () => props.audioSrc,
  (newValue, oldValue, onCleanup) => {
    const audio = new Audio(props.audioSrc)
    audio.load()
    const audioContext = getAudioContext()
    const source = audioContext.createMediaElementSource(audio)
    const nextGainNode = audioContext.createGain()
    source.connect(nextGainNode)
    nextGainNode.connect(audioContext.destination)
    nextGainNode.gain.value = props.gain
    gainNode.value = nextGainNode

    const onTimeUpdate = () => {
      if (audio.paused || audio.ended) return
      const ratio = audio.currentTime / audio.duration
      if (ratio >= props.range.right) {
        audio.pause()
      }
      const nextProgress = Math.min(Math.max((ratio - props.range.left) / (props.range.right - props.range.left), 0), 1)
      emit('progress', nextProgress)
      progress.value = nextProgress

      // The `timeupdate` event doesn't have a high enough fire rate for a smooth animation
      requestAnimationFrame(onTimeUpdate)
    }

    const onError = (e: Event) => {
      console.warn('audio error:', e)
      emit('stop')
    }
    audio.addEventListener('error', onError)

    const onPlay = () => {
      requestAnimationFrame(onTimeUpdate)
    }
    audio.addEventListener('play', onPlay)

    const onPause = () => {
      emit('stop')
      progress.value = 0
      audio.currentTime = audio.duration * props.range.left
    }
    audio.addEventListener('pause', onPause)

    audioElement.value = audio
    onCleanup(() => {
      audio.pause()
      progress.value = 0
      emit('progress', 0)

      audio.removeEventListener('error', onError)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    })
  },
  { immediate: true }
)

const waveformDataFromSrc = useAsyncComputedLegacy(async () => {
  if (!props.audioSrc) return null
  const scale = 5
  const audioContext = getAudioContext()
  const arrayBuffer = await (await fetch(props.audioSrc)).arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  const channelData = audioBuffer.getChannelData(0)

  // First, we group the data into blocks by a fixed block size of 128 samples
  // to match the behavior of the recorder.
  // TODO: This could potentially be optimized by some math, or just ommitted
  const preProcessedData = new Array<number>(Math.floor(channelData.length / 128))
  for (let i = 0; i < preProcessedData.length; i++) {
    let sum = 0
    for (let j = 0; j < 128; j++) {
      sum += Math.abs(channelData[i * 128 + j])
    }
    preProcessedData[i] = sum / 128
  }

  // We want the final waveform to have a length of about 80 points.
  const targetPointLength = 80
  // We use floor(x / 20) * 20 to make the block size a multiple of 20.
  // Thus it changes less frequently and the waveform is more stable.
  const blockSize = Math.max(Math.floor(preProcessedData.length / targetPointLength / 20) * 20, 10)

  // We then calculate the average of each block and scale it.
  const points = new Array<number>(Math.floor(preProcessedData.length / blockSize))
  for (let i = 0; i < points.length; i++) {
    let sum = 0
    for (let j = 0; j < blockSize; j++) {
      sum += preProcessedData[i * blockSize + j]
    }
    points[i] = (sum / blockSize) * scale
  }
  return {
    data: points,
    paddingRight: (preProcessedData.length % blockSize) / blockSize / points.length
  }
})
</script>
