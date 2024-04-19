<template>
  <NImage :src="src" />
</template>
<script setup lang="ts">
import { NImage } from 'naive-ui'
import { ref, watchEffect } from 'vue'

const src = ref()

const props = defineProps<{
  blob: Blob
}>()

watchEffect((onCleanup) => {
  const url = URL.createObjectURL(props.blob)
  src.value = url

  onCleanup(() => URL.revokeObjectURL(url))
})
</script>
