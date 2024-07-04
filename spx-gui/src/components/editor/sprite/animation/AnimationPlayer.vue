<template>
  <div :style="divStyle" class="animation-player-inner">
    <MuteSwitch v-if="audioElement" class="mute-switch" :muted="muted" @click="muted = !muted" />
  </div>
</template>
<script setup lang="ts">
import type { Animation } from '@/models/animation'
import type { Disposer } from '@/models/common/disposable'
import { computed, ref, watch, watchEffect } from 'vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { useFileUrl } from '@/utils/file'
import MuteSwitch from './MuteSwitch.vue'
import type { Costume } from '@/models/costume'

const props = defineProps<{
  animation: Animation
}>()

const editorCtx = useEditorCtx()

const [soundSrc, soundLoading] = useFileUrl(
  () => editorCtx.project.sounds.find((sound) => sound.name === props.animation.sound)?.file
)
// We need to hold the frames in memory to avoid flickering
const frames = ref<HTMLImageElement[]>([])
const audioElement = ref<HTMLAudioElement | null>(null)
const muted = ref(true)
watch(muted, (muted) => {
  if (!audioElement.value) {
    return
  }
  audioElement.value.muted = muted
})

const preloadAudio = async (src: string): Promise<HTMLAudioElement> => {
  const audio = new Audio()
  audio.muted = muted.value
  audio.src = src
  audio.load()
  await new Promise((resolve, reject) => {
    audio.oncanplaythrough = resolve
    audio.onerror = reject
  })
  return audio
}

const preloadFrames = async (costumes: Costume[]) => {
  const disposers: Disposer[] = []
  try {
    const urls = await Promise.all(
      costumes.map((costume) => costume.img.url((f) => disposers.push(f)))
    )

    const imgs = await Promise.all([
      ...urls.map(async (url) => {
        const img = new Image()
        img.src = url
        await img.decode()
        return img
      })
    ])
    return { imgs, disposers }
  } catch (e) {
    while (disposers.length) {
      disposers.pop()?.()
    }
    throw e
  }
}

watch(
  () => [soundSrc.value, soundLoading.value, props.animation.costumes],
  async (_, old, onCleanup) => {
    if (!soundSrc.value && soundLoading.value) {
      audioElement.value?.pause()
      audioElement.value = null
    }
    if (!props.animation.costumes.length) {
      frames.value = []
    }
    if ((!soundSrc.value && soundLoading.value) || !props.animation.costumes.length) return

    const { disposers, imgs } = await preloadFrames(props.animation.costumes)
    onCleanup(() => {
      disposers.forEach((f) => f())
    })

    if (soundSrc.value && !soundLoading.value) {
      const nextAudioElement = await preloadAudio(soundSrc.value)
      audioElement.value?.pause()
      audioElement.value = nextAudioElement
    }

    frames.value = imgs
  },
  { immediate: true, deep: true }
)

const currentFrameIndex = ref(0)

const frameInterval = computed(() => {
  if (frames.value.length === 0) return 0
  return (props.animation.duration / frames.value.length) * 1000 // convert to milliseconds
})

const divStyle = computed(() => {
  if (!frames.value[currentFrameIndex.value]) return
  return {
    background: `url(${frames.value[currentFrameIndex.value].src}) center center / contain no-repeat`
  }
})

watchEffect((onCleanup) => {
  if (frames.value.length === 0 || props.animation.duration === 0) return

  currentFrameIndex.value = 0
  const animationIntervalId = setInterval(async () => {
    const nextIndex = (currentFrameIndex.value + 1) % frames.value.length
    currentFrameIndex.value = nextIndex
  }, frameInterval.value)

  onCleanup(() => {
    clearInterval(animationIntervalId)
    currentFrameIndex.value = 0
  })
})

watchEffect((onCleanup) => {
  const resetSound = () => {
    if (!audioElement.value) return
    audioElement.value.currentTime = 0
    audioElement.value.play()
  }
  const soundIntervalId = setInterval(resetSound, props.animation.duration * 1000)
  try {
    resetSound()
  } catch (e) {
    // We can get an error from `play()` if the sound is not loaded yet
    // or if the sound is not allowed to play
  }

  onCleanup(() => {
    clearInterval(soundIntervalId)
    audioElement.value?.pause()
  })
})
</script>
<style scoped lang="scss">
.animation-player-inner {
  position: relative;
  .mute-switch {
    position: absolute;
    top: 12px;
    right: 12px;
  }
}
</style>
