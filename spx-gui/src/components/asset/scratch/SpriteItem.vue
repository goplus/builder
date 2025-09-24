<template>
  <UISpriteItem ref="wrapperRef" :selectable="{ selected }" :name="asset.name">
    <template #img="{ style }">
      <CostumesAutoPlayer
        v-if="animation != null && hovered"
        :style="style"
        :costumes="animation.costumes"
        :duration="animation.duration"
        :placeholder-img="imgSrc"
      />
      <UIImg v-else :style="style" :src="imgSrc" :loading="imgSrc == null" />
    </template>
    <UICornerIcon v-show="selected" type="check" />
  </UISpriteItem>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { UIImg, UISpriteItem, UICornerIcon } from '@/components/ui'
import { useHovered } from '@/utils/dom'
import type { ExportedScratchCostume, ExportedScratchSprite } from '@/utils/scratch'
import { fromBlob } from '@/models/common/file'
import { Costume } from '@/models/costume'
import { defaultFps } from '@/models/animation'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'

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

const wrapperRef = ref<InstanceType<typeof UISpriteItem>>()
const hovered = useHovered(() => wrapperRef.value?.$el ?? null)

function adaptCostume(c: ExportedScratchCostume) {
  // TODO: deduplicate with `importSprite` in `LoadFromScratch.vue`
  const file = fromBlob(c.name, c.blob)
  return new Costume(c.name, file, {
    bitmapResolution: c.bitmapResolution,
    pivot: {
      x: c.rotationCenterX / c.bitmapResolution,
      y: c.rotationCenterY / c.bitmapResolution
    }
  })
}

const animation = computed(() => {
  const costumes = props.asset.costumes
  if (costumes.length <= 1) return null
  return {
    costumes: costumes.map(adaptCostume),
    duration: costumes.length / defaultFps
  }
})
</script>
