<template>
  <div
    v-radar="{ name: 'Animation player', desc: 'Provides preview for animation' }"
    class="relative overflow-hidden rounded-sm"
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
import { timeout, useActivated } from '@/utils/utils'
import { Cancelled, capture } from '@/utils/exception'
import { AnimationSoundPlayback } from '@/models/spx/animation'
import type { Costume } from '@/models/spx/costume'
import type { Sound } from '@/models/spx/sound'
import { UILoading } from '@/components/ui'
import CostumesPlayer from '@/components/common/CostumesPlayer.vue'
import CheckerboardBackground from '../CheckerboardBackground.vue'
import MuteSwitch from './MuteSwitch.vue'

const props = withDefaults(
  defineProps<{
    costumes: Costume[]
    sound: Sound | null
    soundPlayback?: AnimationSoundPlayback
    duration: number
  }>(),
  {
    soundPlayback: AnimationSoundPlayback.Once
  }
)

const registered = registerAudioPlayer(() => setMuted(true))
const audios = new Set<HTMLAudioElement>()
const mutedRef = ref(true)
function setMuted(muted: boolean) {
  mutedRef.value = muted
  for (const audio of audios) {
    audio.muted = muted
  }
  if (props.sound != null) {
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

// Limit the number of concurrently playing audio instances to prevent overwhelming the browser and causing performance issues or crashes.
const concurrentAudioLimit = 10

/**
 * Play the audio with `playback: AnimationSoundPlayback.Once`.
 * The sound is triggered once per animation cycle (duration).
 * If the previous sound is still playing when the next cycle starts, it will keep playing.
 * In that case, multiple sound instances can overlap.
 */
function playAudioWithPlaybackOnce(audio: HTMLAudioElement, duration: number, signal: AbortSignal) {
  function playOnce() {
    // Create a new audio element to play the sound so it plays independently
    const newAudio = new Audio(audio.src)
    newAudio.muted = mutedRef.value
    audios.add(newAudio)

    const ctrl = new AbortController()
    function stopAndCleanup() {
      if (ctrl.signal.aborted) return
      ctrl.abort(new Cancelled('stop and cleanup'))
      newAudio.pause()
      audios.delete(newAudio)
    }
    newAudio.addEventListener('ended', stopAndCleanup, { signal: ctrl.signal })
    signal.addEventListener('abort', stopAndCleanup, { signal: ctrl.signal })
    // Stop the newAudio after some time to prevent too many overlapping audios
    timeout(duration * 1000 * concurrentAudioLimit, ctrl.signal).then(stopAndCleanup)
    newAudio.play()
  }
  playOnce()
  const timer = setInterval(playOnce, duration * 1000)
  signal.addEventListener('abort', () => clearInterval(timer), { once: true })
}

/**
 * Play the audio with `playback: AnimationSoundPlayback.Loop`.
 * The sound loops continuously within each animation cycle.
 * When a new cycle starts, playback is reset to the beginning.
 * This prevents overlapping between cycles.
 */
function playAudioWithPlaybackLoop(audio: HTMLAudioElement, duration: number, signal: AbortSignal) {
  function playFromStart() {
    audio.currentTime = 0
    audio.play()
  }
  audio.loop = true
  audio.muted = mutedRef.value
  audios.add(audio)
  signal.addEventListener(
    'abort',
    () => {
      audio.pause()
      audios.delete(audio)
    },
    { once: true }
  )
  playFromStart()
  const timer = setInterval(playFromStart, duration * 1000)
  signal.addEventListener('abort', () => clearInterval(timer), { once: true })
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
    const { costumes, sound, soundPlayback, duration } = props
    const [, audio] = await Promise.all([
      costumesPlayer.load(costumes, duration, signal),
      sound != null ? loadAudio(sound, signal) : null
    ])
    signal.throwIfAborted()

    costumesPlayer.play(signal)
    if (audio != null) {
      if (soundPlayback === AnimationSoundPlayback.Once) {
        playAudioWithPlaybackOnce(audio, duration, signal)
      } else if (soundPlayback === AnimationSoundPlayback.Loop) {
        playAudioWithPlaybackLoop(audio, duration, signal)
      }
    }
  } catch (e) {
    ctrl.abort(e)
    capture(e, 'load and play animation failed')
  } finally {
    loading.value = false
  }
})
</script>
