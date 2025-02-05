<template>
  <UISpriteItem :selectable="{ selected }" :name="asset.displayName">
    <template #img="{ style }">
      <UIImg :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
  </UISpriteItem>
</template>

<script setup lang="ts">
import { UIImg, UISpriteItem } from '@/components/ui'
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
