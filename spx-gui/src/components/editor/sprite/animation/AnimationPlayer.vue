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

const props = defineProps<{
  animation: Animation
}>()

const editorCtx = useEditorCtx()

const [soundSrc, soudLoading] = useFileUrl(
  () => editorCtx.project.sounds.find((sound) => sound.name === props.animation.sound)?.file
)
const frameSrcList = ref<string[]>([])
const audioElement = ref<HTMLAudioElement | null>(null)
const muted = ref(true)
watch(muted, (muted) => {
  if (!audioElement.value) {
    return
  }
  audioElement.value.muted = muted
})
watchEffect(async (onCleanup) => {
  if (!soundSrc.value && soudLoading.value) {
    audioElement.value?.pause()
    audioElement.value = null
  }
  if (!props.animation.costumes.length) {
    frameSrcList.value = []
  }
  if ((!soundSrc.value && soudLoading.value) || !props.animation.costumes.length) return

  const disposers: Disposer[] = []
  onCleanup(() => {
    disposers.forEach((f) => f())
  })

  const urls = await Promise.all(
    props.animation.costumes.map((costume) => costume.img.url((f) => disposers.push(f)))
  )

  await Promise.all([
    // Preload all frames and audio
    ...urls.map((url) => {
      const img = new Image()
      img.src = url
      return img.decode()
    })
  ])

  if (soundSrc.value && !soudLoading.value) {
    const nextAudioElement = new Audio()
    nextAudioElement.muted = muted.value
    nextAudioElement.src = soundSrc.value
    nextAudioElement.load()
    await new Promise((resolve, reject) => {
      nextAudioElement.oncanplaythrough = resolve
      nextAudioElement.onerror = reject
    })
    audioElement.value?.pause()
    audioElement.value = nextAudioElement
  }

  frameSrcList.value = urls
})

const currentFrameIndex = ref(0)

const frameInterval = computed(() => {
  if (frameSrcList.value.length === 0) return 0
  return (props.animation.duration / frameSrcList.value.length) * 1000 // convert to milliseconds
})

const divStyle = computed(() => ({
  background: `url(${frameSrcList.value[currentFrameIndex.value]}) center center / contain no-repeat`
}))

watchEffect((onCleanup) => {
  if (frameSrcList.value.length === 0) return

  const animationIntervalId = setInterval(async () => {
    const nextIndex = (currentFrameIndex.value + 1) % frameSrcList.value.length
    // Preload next frame to avoid flicker
    const nextFrame = new Image()
    nextFrame.src = frameSrcList.value[nextIndex]
    await nextFrame.decode()
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
