<template>
  <UIImg class="sprite-preview" :src="imgSrc" :loading="imgLoading" style="height: 100%; width: 100%;"/>
</template>

<script setup lang="ts">
import { UISpriteItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import type { AssetData, AssetType } from '@/apis/asset'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  asset: AssetData<AssetType.Sprite>
}>()

const sprite = useAsyncComputed(() => cachedConvertAssetData(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => sprite.value?.defaultCostume?.img)
</script>
