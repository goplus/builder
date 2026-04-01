<template>
  <div
    v-radar="{ name: 'Animation player', desc: 'Provides preview for animation' }"
    class="relative overflow-hidden rounded-1"
  >
    <CheckerboardBackground class="absolute inset-0" />
    <CostumesPlayer ref="costumesPlayerRef" class="absolute h-full w-full" />
    <MuteSwitch v-if="sound != null" class="absolute top-3 right-3" :muted="mutedRef" @click="setMuted(!mutedRef)" />
    <UILoading :visible="loading" cover />
  </div>
</template>
<script setup lang="ts">
import { onUnmounted, ref, watchEffect } from 'vue'
import { registerPlayer as registerAudioPlayer } from '@/utils/player-registry'
import { useActivated } from '@/utils/utils'
import { Cancelled, capture } from '@/utils/exception'
import type { Costume } from '@/models/spx/costume'
import type { Sound } from '@/models/spx/sound'
import { UILoading } from '@/components/ui'
import CostumesPlayer from '@/components/common/CostumesPlayer.vue'
import CheckerboardBackground from '../CheckerboardBackground.vue'
import MuteSwitch from './MuteSwitch.vue'

const props = defineProps<{
  costumes: Costume[]
  sound: Sound | null
  duration: number
}>()

const registered = registerAudioPlayer(() => setMuted(true))
const audioRef = ref<HTMLAudioElement | null>(null)
const mutedRef = ref(true)
function setMuted(muted: boolean) {
  mutedRef.value = muted
  if (audioRef.value != null) {
    audioRef.value.muted = muted
    if (muted) registered.onStopped()
    else registered.onStart()
  }
}

async function loadAudio(sound: Sound, signal: AbortSignal) {
  const audio = new Audio()
  audio.src = await sound.file.url((f) => signal.addEventListener('abort', f))
  audio.load()
  await new Promise((resolve, reject) => {
    audio.oncanplaythrough = resolve
    audio.onerror = reject
  })
  return audio
}

function playAudio(audio: HTMLAudioElement, duration: number, signal: AbortSignal) {
  audio.muted = mutedRef.value
  audioRef.value = audio
  const playFromStart = () => {
    try {
      audio.currentTime = 0
      audio.play()
    } catch {
      // We can get an error from `play()` if the sound is not loaded yet
      // or if the sound is not allowed to play
    }
  }
  playFromStart()
  const timer = setInterval(playFromStart, duration * 1000)
  signal.addEventListener('abort', async () => {
    clearInterval(timer)
    audio.pause()
    audioRef.value = null
  })
}

const activatedRef = useActivated()
const costumesPlayerRef = ref<InstanceType<typeof CostumesPlayer> | null>(null)

let lastPlayCtrl: AbortController | null = null
onUnmounted(() => lastPlayCtrl?.abort(new Cancelled('unmounted')))
function getPlayCtrl() {
  lastPlayCtrl?.abort(new Cancelled('new invoking'))
  const ctrl = new AbortController()
  lastPlayCtrl = ctrl
  return ctrl
}

const loading = ref(false)

watchEffect(async () => {
  const ctrl = getPlayCtrl()
  loading.value = true
  if (!activatedRef.value) return
  const costumesPlayer = costumesPlayerRef.value
  if (costumesPlayer == null) return
  try {
    const signal = ctrl.signal
    const { costumes, sound, duration } = props
    const [, audio] = await Promise.all([
      costumesPlayer.load(costumes, duration, signal),
      sound != null ? loadAudio(sound, signal) : null
    ])
    signal.throwIfAborted()

    costumesPlayer.play(signal)
    if (audio != null) playAudio(audio, duration, signal)
  } catch (e) {
    ctrl.abort(e)
    capture(e, 'load and play animation failed')
  } finally {
    loading.value = false
  }
})
</script>
