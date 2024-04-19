<!-- Sound player for given audio src, based on `DumbSoundPlayer` -->

<template>
  <DumbSoundPlayer
    :playing="playing != null"
    :progress="playing?.progress ?? 0"
    @play="handlePlay"
    @stop="handleStop"
  />
</template>

<script setup lang="ts">
import { reactive, ref, watchEffect } from 'vue'
import DumbSoundPlayer from '../editor/sound/DumbSoundPlayer.vue'

const props = defineProps<{
  blob: Blob
}>()

type Playing = {
  progress: number
  audio: HTMLAudioElement
}

const playing = ref<Playing | null>(null)
const src = ref<string>()

watchEffect((cleanUp) => {
  const url = URL.createObjectURL(props.blob)
  src.value = url
  cleanUp(() => {
    URL.revokeObjectURL(url)
  })
})

async function handlePlay() {
  if (!src.value) return
  playing.value = makePlaying(src.value)
  await playing.value.audio.play()
}

function makePlaying(src: string) {
  const audio = new Audio(src)
  const p = reactive({ audio, progress: 0 })
  audio.addEventListener('timeupdate', () => {
    p.progress = Math.round((audio.currentTime / audio.duration) * 100)
  })
  audio.addEventListener('error', (e) => {
    console.warn('audio error:', e)
    handleStop()
  })
  audio.addEventListener('ended', () => {
    // delay to make the animation more natural
    setTimeout(handleStop, 400)
  })
  return p
}

function handleStop() {
  playing.value?.audio.pause()
  playing.value = null
}
</script>
