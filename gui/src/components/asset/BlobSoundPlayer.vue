<!-- Sound player for given audio blob, based on `SoundPlayer` -->

<template>
  <SoundPlayer :src="src" size="large" />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import SoundPlayer from '../editor/stage/sound/SoundPlayer.vue'

const props = defineProps<{
  blob: Blob
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
