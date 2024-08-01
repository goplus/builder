<template>
  <UIBackdropItem
    :img-src="imgSrc"
    :img-loading="!imgSrc || imgLoading"
    :name="asset.displayName"
    :selected="selected"
  />
</template>

<script setup lang="ts">
import { UIBackdropItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { AssetData, AssetType } from '@/apis/asset'
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'

const props = defineProps<{
  asset: AssetData<AssetType.Backdrop>
  selected: boolean
}>()

const backdrop = useAsyncComputed(() => cachedConvertAssetData(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => backdrop.value?.img)
</script>
