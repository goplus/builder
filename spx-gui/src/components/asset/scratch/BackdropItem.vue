<template>
  <UIBackdropItem :selectable="{ selected }" :img-src="imgSrc" :img-loading="!imgSrc" :name="asset.name" />
</template>

<script setup lang="ts">
import { UIBackdropItem } from '@/components/ui'
import type { ExportedScratchFile } from '@/utils/scratch'
import { ref, watchEffect } from 'vue'

const props = defineProps<{
  asset: ExportedScratchFile
  selected: boolean
}>()

const imgSrc = ref()

watchEffect((onCleanup) => {
  const url = URL.createObjectURL(props.asset.blob)
  imgSrc.value = url

  onCleanup(() => URL.revokeObjectURL(url))
})
</script>
