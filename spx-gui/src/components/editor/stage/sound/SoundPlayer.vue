<!-- Sound player for given audio src, based on `PlayControl` -->

<template>
  <PlayControl :playing="playing" :play-handler="handlePlay" :loading="loading" :size="size" @stop="stop" />
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import { registerPlayer } from '@/utils/player-registry'
import PlayControl, { type Playing, type Size } from '../../common/PlayControl.vue'

const props = defineProps<{
  src: string | null
  size?: Size
}>()

type PlayingWithAudio = Playing & {
  audio: HTMLAudioElement
}

const playing = ref<PlayingWithAudio | null>(null)
const registered = registerPlayer(stop)

async function handlePlay() {
  if (props.src == null) return
  playing.value = makePlaying(props.src)
  registered.onStart()
  await playing.value.audio.play()
}

function makePlaying(src: string) {
  const audio = new Audio(src)
  const p = reactive<PlayingWithAudio>({ audio, progress: 0 })
  audio.addEventListener('timeupdate', () => {
    p.progress = audio.currentTime / audio.duration
  })
  audio.addEventListener('error', (e) => {
    console.warn('audio error:', e)
    stop()
  })
  audio.addEventListener('ended', stop)
  return p
}

const loading = computed(() => props.src == null) // TODO: seeking?

function stop() {
  playing.value?.audio.pause()
  playing.value = null
  registered.onStopped()
}

onUnmounted(stop)
</script>
