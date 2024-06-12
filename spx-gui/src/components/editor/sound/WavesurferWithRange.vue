<template>
  <div class="container">
    <div ref="wavesurferDiv" class="wavesurfer" />
    <SoundEditorControl :value="range" @update:value="handleAudioRangeUpdate" @stop-drag="play" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'
import SoundEditorControl from './SoundEditorControl.vue'
import { useWavesurfer } from './wavesurfer'
import type WaveSurfer from 'wavesurfer.js'
import { trimAndApplyGainToWavBlob } from '@/utils/audio'

const props = defineProps<{
  audioUrl?: string | null
  range: { left: number; right: number }
  gain: number
  recording?: boolean
}>()

const emit = defineEmits<{
  play: []
  stop: []
  progress: [progress: number]
  init: [wavesurfer: WaveSurfer]
  load: []
  'update:range': [{ left: number; right: number }]
}>()

watch(
  () => props.range.left,
  (left) => {
    if (wavesurferRef.value == null || wavesurferRef.value.isPlaying()) return
    wavesurferRef.value.seekTo(left)
  }
)

const play = () => {
  if (wavesurferRef.value == null) return
  wavesurferRef.value.seekTo(props.range.left)
  wavesurferRef.value.play()
}

defineExpose({
  play,
  stop: () => {
    if (wavesurferRef.value == null) return
    wavesurferRef.value.pause()
    wavesurferRef.value.seekTo(props.range.left)
    emit('stop')
  },
  exportWav: async () => {
    if (wavesurferRef.value == null) throw new Error('wavesurferRef is null')
    const audioBuffer = wavesurferRef.value.getDecodedData()
    if (audioBuffer == null) throw new Error('audioBuffer is null')
    const wav = await trimAndApplyGainToWavBlob(
      audioBuffer,
      props.range.left,
      props.range.right,
      props.gain
    )
    return wav
  },
  empty: () => {
    if (wavesurferRef.value == null) return
    wavesurferRef.value.empty()
  }
})

const handleAudioRangeUpdate = (range: { left: number; right: number }) => {
  emit('update:range', range)
}

const wavesurferDiv = ref<HTMLDivElement>()

const wavesurferRef = useWavesurfer(
  () => wavesurferDiv.value,
  () => props.gain,
  props.recording
)

// we assume that wavesurferDiv.value will not change
watch(wavesurferRef, (wavesurfer) => {
  if (wavesurfer == null) return
  wavesurfer.on('timeupdate', () => {
    if (wavesurfer == null) return
    const ratio = wavesurfer.getCurrentTime() / wavesurfer.getDuration()
    if (ratio >= props.range.right) {
      wavesurfer.pause()
      wavesurfer.seekTo(props.range.left)
      emit('stop')
    }

    const progress = Math.min(
      Math.max((ratio - props.range.left) / (props.range.right - props.range.left), 0),
      1
    )
    emit('progress', progress)
  })
  wavesurfer.on('error', (e) => {
    console.warn('wavesurfer error:', e)
    wavesurfer.stop()
    emit('stop')
  })
  wavesurfer.on('play', () => {
    emit('play')
  })
  emit('init', wavesurfer as WaveSurfer)
})

watchEffect(async () => {
  if (props.audioUrl == null || wavesurferRef.value == null) {
    return
  }

  const wavesurfer = wavesurferRef.value
  await wavesurfer.load(props.audioUrl)
  emit('load')
})
</script>
<style lang="scss" scoped>
.container {
  position: relative;
  .wavesurfer {
    height: 100%;
    margin: 0 16px;
  }
  height: 160px;
  border-radius: 12px;
  background-color: var(--ui-color-grey-300);
  overflow: hidden;
}
</style>
