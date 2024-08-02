<template>
  <NImage
    v-if="imgSrc"
    class="sprite-preview"
    :src="imgSrc"
    :loading="imgLoading"
    width="100%"
    object-fit="contain"
    style="width: 100%"
  />
  <UILoading v-else cover :mask="false" />
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import type { AssetData, AssetType } from '@/apis/asset'
import { NImage } from 'naive-ui'
import { UILoading } from '@/components/ui'

const props = defineProps<{
  asset: AssetData<AssetType.Sprite>
}>()

const sprite = useAsyncComputed(() => cachedConvertAssetData(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => sprite.value?.defaultCostume?.img)
</script>
