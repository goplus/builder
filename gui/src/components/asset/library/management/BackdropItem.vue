<script setup lang="ts">
import { computed } from 'vue'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import type { AssetData } from '@/apis/asset'
import { asset2Backdrop } from '@/models/spx/common/asset'
import { UIBackdropItem } from '@/components/ui'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const backdrop = useAsyncComputedLegacy(() => asset2Backdrop(props.asset))
const [imgSrc, imgLoading] = useRenderableImageUrl(() => backdrop.value?.img)
const name = computed(() => props.asset.displayName)
</script>

<template>
  <UIBackdropItem :img-src="imgSrc" :img-loading="imgLoading" :name="name" :selectable="{ selected }">
    <slot></slot>
  </UIBackdropItem>
</template>
