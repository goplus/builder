<template>
  <UIImg class="sprite-preview" :src="imgSrc" :loading="imgLoading" />
</template>

<script setup lang="ts">
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import { asset2Sprite } from '@/models/common/asset'
import { Sprite } from '@/models/sprite'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  sprite: Sprite | AssetData
}>()

const sprite = useAsyncComputedLegacy(async () => {
  if (props.sprite instanceof Sprite) return props.sprite
  return asset2Sprite(props.sprite)
})
const [imgSrc, imgLoading] = useFileUrl(() => sprite.value?.defaultCostume?.img)
</script>
