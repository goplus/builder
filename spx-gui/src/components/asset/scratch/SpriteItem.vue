<template>
  <UISpriteItem :selected="selected" :img-src="imgSrc" :img-loading="!imgSrc" :name="asset.name" />
</template>

<script setup lang="ts">
import { UISpriteItem } from '@/components/ui'
import type { ExportedScratchSprite } from '@/utils/scratch'
import { ref, watchEffect } from 'vue'

const props = defineProps<{
  asset: ExportedScratchSprite
  selected: boolean
}>()

const imgSrc = ref<string | null>(null)

watchEffect((onCleanup) => {
  if (!props.asset.costumes.length) {
    return
  }
  const url = URL.createObjectURL(props.asset.costumes[0].blob)
  imgSrc.value = url

  onCleanup(() => URL.revokeObjectURL(url))
})
</script>
