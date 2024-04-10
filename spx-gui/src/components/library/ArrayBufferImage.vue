<template>
  <NImage :src="src" />
</template>
<script setup lang="ts">
import { NImage } from 'naive-ui'
import { ref, watchEffect } from 'vue'

const src = ref()

const props = defineProps<{
  arrayBuffer: ArrayBuffer
}>()

watchEffect((onCleanup) => {
  const blob = new Blob([props.arrayBuffer])
  const url = URL.createObjectURL(blob)

  src.value = url

  onCleanup(() => URL.revokeObjectURL(url))
})
</script>
