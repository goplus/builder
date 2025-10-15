<template>
  <UIImg class="backdrop-preview" :src="imgSrc" :loading="imgLoading" size="cover" />
</template>

<script setup lang="ts">
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import { asset2Backdrop } from '@/models/common/asset'
import { Backdrop } from '@/models/backdrop'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  backdrop: Backdrop | AssetData
}>()

const backdrop = useAsyncComputedLegacy(async () => {
  if (props.backdrop instanceof Backdrop) return props.backdrop
  return asset2Backdrop(props.backdrop)
})
const [imgSrc, imgLoading] = useFileUrl(() => backdrop.value?.img)
</script>
