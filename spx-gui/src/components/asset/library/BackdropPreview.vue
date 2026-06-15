<template>
  <UIImg class="backdrop-preview" :src="imgSrc" :loading="imgLoading" size="cover" />
</template>

<script setup lang="ts">
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useImgFileUrl } from '@/utils/img'
import type { AssetData } from '@/apis/asset'
import { asset2Backdrop } from '@/models/spx/common/asset'
import { Backdrop } from '@/models/spx/backdrop'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  backdrop: Backdrop | AssetData
}>()

const backdrop = useAsyncComputedLegacy(async () => {
  if (props.backdrop instanceof Backdrop) return props.backdrop
  return asset2Backdrop(props.backdrop)
})
const [imgSrc, imgLoading] = useImgFileUrl(() => backdrop.value?.img)
</script>
