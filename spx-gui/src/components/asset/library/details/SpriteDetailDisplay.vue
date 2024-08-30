<template>
  <div class="container">
    <SpriteCarousel v-if="sprite" :sprite="sprite" class="sprite-carousel" />
    <UILoading v-else />
  </div>
</template>

<script setup lang="ts">
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import type { AssetData, AssetType } from '@/apis/asset'
import { UILoading } from '@/components/ui'
import SpriteCarousel from './SpriteCarousel.vue'

const props = defineProps<{
  asset: AssetData<AssetType.Sprite>
}>()

const sprite = useAsyncComputed(() => {
  return cachedConvertAssetData(props.asset)
})
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sprite-carousel {
  width: 85%;
  overflow: visible;
  position: relative;
}
</style>
