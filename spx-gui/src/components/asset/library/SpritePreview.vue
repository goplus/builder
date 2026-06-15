<template>
  <UIImg class="sprite-preview" :src="imgSrc" :loading="imgLoading" />
</template>

<script setup lang="ts">
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useImgFileUrl } from '@/utils/img'
import type { AssetData } from '@/apis/asset'
import { asset2Sprite } from '@/models/spx/common/asset'
import { Sprite } from '@/models/spx/sprite'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  sprite: Sprite | AssetData
}>()

const sprite = useAsyncComputedLegacy(async () => {
  if (props.sprite instanceof Sprite) return props.sprite
  return asset2Sprite(props.sprite)
})
const [imgSrc, imgLoading] = useImgFileUrl(() => sprite.value?.defaultCostume?.img)
</script>
