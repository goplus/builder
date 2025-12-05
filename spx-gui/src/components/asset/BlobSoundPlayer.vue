<!-- Sound player for given audio blob, based on `SoundPlayer` -->

<template>
  <SoundPlayer :src="src" :color="color" size="large" />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { Color } from '@/components/ui'
import SoundPlayer from '../editor/sound/SoundPlayer.vue'

const props = defineProps<{
  blob: Blob
  color: Color
}>()

const src = ref('')

watchEffect((cleanUp) => {
  const url = URL.createObjectURL(props.blob)
  src.value = url
  cleanUp(() => {
    URL.revokeObjectURL(url)
  })
})
</script>
