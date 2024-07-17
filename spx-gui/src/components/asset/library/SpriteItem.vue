<template>
  <UISpriteItem
    :selected="selected"
    :img-src="imgSrc"
    :img-loading="!imgSrc || imgLoading"
    :name="asset.displayName"
  />
</template>

<script setup lang="ts">
import { UISpriteItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import { asset2Sprite } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const sprite = useAsyncComputed(() => asset2Sprite(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => sprite.value?.defaultCostume?.img)
</script>

<style lang="scss" scoped>
.img {
  width: 99px;
  height: 99px;
}

.img-container {
  flex: 1;
  display: flex;
  align-items: center;
}
</style>
