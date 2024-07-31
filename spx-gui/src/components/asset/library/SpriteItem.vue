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
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import type { AssetData, AssetType } from '@/apis/asset'

const props = defineProps<{
  asset: AssetData<AssetType.Sprite>
  selected: boolean
}>()

const sprite = useAsyncComputed(() => cachedConvertAssetData(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => sprite.value?.defaultCostume?.img)
</script>
