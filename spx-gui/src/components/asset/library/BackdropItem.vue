<template>
  <AssetItem class="backdrop-item" color="stage" :selected="selected">
    <div class="img-container">
      <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    </div>
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
  width: 132px;
  height: 98px;
  border-radius: 9px; // is not one of the predefined tokens
}

.img-container {
  flex: 1;
  display: flex;
  align-items: center;
}
</style>
