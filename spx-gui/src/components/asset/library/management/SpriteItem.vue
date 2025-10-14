<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHovered } from '@/utils/dom'
import { useFileUrl } from '@/utils/file'
import { useAsyncComputedLegacy } from '@/utils/utils'
import type { AssetData } from '@/apis/asset'
import { asset2Sprite } from '@/models/common/asset'
import { UIImg, UISpriteItem } from '@/components/ui'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const sprite = useAsyncComputedLegacy(() => asset2Sprite(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => sprite.value?.defaultCostume?.img)
const name = computed(() => props.asset.displayName)
const wrapperRef = ref<InstanceType<typeof UISpriteItem>>()
const hovered = useHovered(() => wrapperRef.value?.$el ?? null)
const animation = computed(() => sprite.value?.getDefaultAnimation())
</script>

<template>
  <UISpriteItem ref="wrapperRef" :name="name" :selectable="{ selected }">
    <template #img="{ style }">
      <CostumesAutoPlayer
        v-if="animation != null && hovered"
        :style="style"
        :costumes="animation.costumes"
        :duration="animation.duration"
        :placeholder-img="imgSrc"
      />
      <UIImg v-else :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <slot></slot>
  </UISpriteItem>
</template>
