<template>
  <UIBackdropItem :selectable="{ selected }" :img-src="imgSrc" :img-loading="!imgSrc" :name="asset.name">
    <UICornerIcon v-show="selected" type="check" />
  </UIBackdropItem>
</template>

<script setup lang="ts">
import { UIBackdropItem, UICornerIcon } from '@/components/ui'
import type { ExportedScratchCostume } from '@/utils/scratch'
import { ref, watchEffect } from 'vue'

const props = defineProps<{
  asset: ExportedScratchCostume
  selected: boolean
}>()

const imgSrc = ref<string | null>(null)

watchEffect((onCleanup) => {
  const url = URL.createObjectURL(props.asset.blob)
  imgSrc.value = url

  onCleanup(() => URL.revokeObjectURL(url))
})
</script>
