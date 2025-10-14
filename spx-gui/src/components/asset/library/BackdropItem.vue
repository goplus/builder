<template>
  <UIBackdropItem
    :img-src="imgSrc"
    :img-loading="!imgSrc || imgLoading"
    :name="asset.displayName"
    :selectable="{ selected }"
  >
    <UICornerIcon v-show="selected" type="check" />
  </UIBackdropItem>
</template>

<script setup lang="ts">
import { UIBackdropItem, UICornerIcon } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import { asset2Backdrop } from '@/models/common/asset'
import { useAsyncComputedLegacy } from '@/utils/utils'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const backdrop = useAsyncComputedLegacy(() => asset2Backdrop(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => backdrop.value?.img)
</script>
