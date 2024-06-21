<template>
  <div>
    <WaveformPlayer
      ref="waveformPlayerRef"
      :audio-src="recordedSrc"
      :custom-waveform-data="waveformData"
      :range="range"
      :gain="gain"
      :height="160"
      @update:range="emit('update:range', $event)"
      @play="emit('playbackStarted')"
      @stop="emit('playbackStoped')"
    />
  </div>
</template>
<script lang="ts">
let sumProcessorLoaded = false
</script>
<script setup lang="ts">
import { getAudioContext } from '@/utils/audio'
import WaveformPlayer from './WaveformPlayer.vue'
import { onMounted, onUnmounted, ref, watchEffect } from 'vue'
import sumProcessorUrl from './sum-processor.js?url'

defineProps<{
  range: { left: number; right: number }
  gain: number
}>()

const emit = defineEmits<{
  'update:range': [value: { left: number; right: number }]
  playbackStarted: []
  playbackStoped: []
  recordStarted: []
  recordStopped: [Blob]
}>()

const waveformData = ref<{ data: number[]; paddingRight: number }>()
const recordedBlob = ref<Blob | null>(null)

const recordedSrc = ref<string>()
watchEffect((onCleanup) => {
  if (recordedBlob.value) {
    const url = URL.createObjectURL(recordedBlob.value)
    recordedSrc.value = url
    onCleanup(() => {
      URL.revokeObjectURL(url)
    })
  } else {
    recordedSrc.value = undefined
  }
})

const waveformPlayerRef = ref<InstanceType<typeof WaveformPlayer> | null>(null)

let mediaRecorder: MediaRecorder | null = null

let rawData: number[] = []
let rawDataBuffer: number[] = []

let cachedWaveformData: {
  data: number[]
  blockSize: number
} = {
  data: [],
  blockSize: 0
}

const updateWaveform = () => {
  if (!mediaRecorder) return
  const scale = 5

  rawData = [...rawData, ...rawDataBuffer]
  rawDataBuffer = []

  const targetPointLength = 80
  const blockSize = Math.max(Math.floor(rawData.length / targetPointLength / 20) * 20, 10)

  if (blockSize > 0) {
    let points: number[] = []
    if (cachedWaveformData.blockSize === blockSize) {
      points = cachedWaveformData.data
    } else {
      cachedWaveformData = { data: [], blockSize }
    }

    const startIdx = points.length * blockSize
    const newPoints = new Array<number>(Math.floor((rawData.length - startIdx) / blockSize))

    for (let i = 0; i < newPoints.length; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += rawData[startIdx + i * blockSize + j]
      }
      newPoints[i] = (sum / blockSize) * scale
    }

    cachedWaveformData.data = [...points, ...newPoints]

    waveformData.value = {
      data: cachedWaveformData.data,
      paddingRight: (rawData.length % blockSize) / blockSize / cachedWaveformData.data.length
    }
  }

  requestAnimationFrame(updateWaveform)
}

const startRecording = async () => {
  if (mediaRecorder) {
    throw new Error('Already started')
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const audioContext = getAudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  if (!sumProcessorLoaded) {
    await audioContext.audioWorklet.addModule(sumProcessorUrl)
    sumProcessorLoaded = true
  }
  const audioWorkletNode = new AudioWorkletNode(audioContext, 'sum-processor', {})
  source.connect(audioWorkletNode)

  const nextMediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm',
    audioBitsPerSecond: 128000 // 128kbps
  })

  const recordedChunks: Blob[] = []
  nextMediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data)
    }
  }

  const onStop = () => {
    const blob = new Blob(recordedChunks, {
      type: nextMediaRecorder.mimeType
    })
    recordedBlob.value = blob
    mediaRecorder = null
    stream.getTracks().forEach((track) => track.stop())
    emit('recordStopped', blob)
    source.disconnect()
    rawData = []
    rawDataBuffer = []
    // waveformData.value = undefined
  }

  nextMediaRecorder.onstart = () => {
    audioWorkletNode.port.onmessage = (
      event: MessageEvent<{
        sum: number
        length: number // We assume this is always 128: <https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process>
      }>
    ) => {
      rawDataBuffer.push(event.data.sum / event.data.length)
      // This function runs every 128 samples, which is about 3ms at 44.1kHz
      // So we want to keep it as simple as possible
    }

    mediaRecorder = nextMediaRecorder
    emit('recordStarted')
    requestAnimationFrame(updateWaveform)
  }
  nextMediaRecorder.onstop = onStop
  nextMediaRecorder.onpause = onStop

  nextMediaRecorder.start()
}

const stopRecording = () => {
  if (!mediaRecorder) {
    throw new Error('Not started')
  }
  mediaRecorder.stop()
}

onMounted(() => {
  startRecording()
})

onUnmounted(() => {
  if (mediaRecorder) {
    mediaRecorder.stop()
  }
})

defineExpose({
  stopRecording,
  startPlayback: () => {
    if (!waveformPlayerRef.value) return
    waveformPlayerRef.value.play()
  },
  exportWav: () => {
    if (!waveformPlayerRef.value) throw new Error('Not yet recorded')
    return waveformPlayerRef.value.exportWav()
  }
})
</script>
<style lang="scss" scoped></style>
