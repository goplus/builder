<template>
  <AssetItem class="sprite-item" :active="active">
    <div class="img" :style="imgStyle"></div>
    <AssetItemName>{{ asset.displayName }}</AssetItemName>
  </AssetItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import AssetItem from './AssetItem.vue'
import AssetItemName from './AssetItemName.vue'
import { asset2Sprite } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'

const props = defineProps<{
  asset: AssetData
  active: boolean
}>()

const sprite = useAsyncComputed(() => asset2Sprite(props.asset))
const imgSrc = useFileUrl(() => sprite.value?.costume?.img)
const imgStyle = computed(() => imgSrc.value && { backgroundImage: `url("${imgSrc.value}")` })
</script>

<style lang="scss" scoped>
.img {
  margin: 2px 0 6px;
  width: 99px;
  height: 99px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}
</style>
