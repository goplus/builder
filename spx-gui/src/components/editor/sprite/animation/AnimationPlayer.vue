<template>
  <img :src="currentFrame" alt="Animation Frame" />
</template>
<script setup lang="ts">
import type { Animation } from '@/models/animation'
import type { Disposer } from '@/models/common/disposable'
import { computed, ref, watchEffect } from 'vue'

const props = defineProps<{
  animation: Animation
}>()

const frameSrcList = ref<string[]>([])
watchEffect(async (onCleanup) => {
  const disposers: Disposer[] = []
  onCleanup(() => {
    disposers.forEach((f) => f())
  })

  const urls = await Promise.all(
    props.animation.costumes.map((costume) =>
      costume.img.url((f) => {
        disposers.push(f)
      })
    )
  )
  frameSrcList.value = urls
})

const currentFrameIndex = ref(0)

const frameInterval = computed(() => {
  if (frameSrcList.value.length === 0) return 0
  return (props.animation.duration / frameSrcList.value.length) * 1000 // convert to milliseconds
})

const currentFrame = computed(() => frameSrcList.value[currentFrameIndex.value])

watchEffect((onCleanup) => {
  if (frameSrcList.value.length === 0) return

  const intervalId = setInterval(() => {
    currentFrameIndex.value = (currentFrameIndex.value + 1) % frameSrcList.value.length
  }, frameInterval.value)

  onCleanup(() => {
    currentFrameIndex.value = 0
    clearInterval(intervalId)
  })
})
</script>
<style scoped lang="scss"></style>
