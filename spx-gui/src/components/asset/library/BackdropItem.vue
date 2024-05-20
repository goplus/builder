<template>
  <AssetItem class="backdrop-item" :selected="selected">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    <AssetItemName>{{ asset.displayName }}</AssetItemName>
  </AssetItem>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import { asset2Backdrop } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import AssetItem from './AssetItem.vue'
import AssetItemName from './AssetItemName.vue'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const backdrop = useAsyncComputed(() => asset2Backdrop(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => backdrop.value?.img)
</script>

<style lang="scss" scoped>
.img {
  margin: 2px 0 6px;
  width: 99px;
  height: 99px;
}
</style>
