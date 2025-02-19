<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { getCleanupSignal, type OnCleanup } from '@/utils/disposable'
import type { Costume } from '@/models/costume'
import CostumesPlayer from './CostumesPlayer.vue'

const props = defineProps<{
  costumes: Costume[]
  /** Duration (in seconds) for all costumes to be played once */
  duration: number
  placeholderImg?: string | null
}>()

const playerRef = ref<InstanceType<typeof CostumesPlayer>>()

const loadAndPlay = useMessageHandle(async (onCleanup: OnCleanup) => {
  const player = playerRef.value
  if (player == null) return
  const signal = getCleanupSignal(onCleanup)
  const { costumes, duration } = props
  await player.load(costumes, duration, signal)
  player.play(signal)
}).fn

watchEffect(loadAndPlay)
</script>

<template>
  <CostumesPlayer ref="playerRef" :placeholder-img="placeholderImg" />
</template>
