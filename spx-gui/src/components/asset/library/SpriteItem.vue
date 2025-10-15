<template>
  <UISpriteItem ref="wrapperRef" :selectable="{ selected }" :name="asset.displayName">
    <template #img="{ style }">
      <CostumesAutoPlayer
        v-if="animation != null && hovered"
        :style="style"
        :costumes="animation.costumes"
        :duration="animation.duration"
        :placeholder-img="imgSrc"
      />
      <UIImg v-else :style="style" :src="imgSrc" :loading="imgLoading" />
    </template>
    <UICornerIcon v-show="selected" type="check" />
  </UISpriteItem>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIImg, UISpriteItem, UICornerIcon } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { AssetData } from '@/apis/asset'
import { asset2Sprite } from '@/models/common/asset'
import { useAsyncComputedLegacy } from '@/utils/utils'
import { useHovered } from '@/utils/dom'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const sprite = useAsyncComputedLegacy(() => asset2Sprite(props.asset))
const [imgSrc, imgLoading] = useFileUrl(() => sprite.value?.defaultCostume?.img)
const wrapperRef = ref<InstanceType<typeof UISpriteItem>>()
const hovered = useHovered(() => wrapperRef.value?.$el ?? null)
const animation = computed(() => sprite.value?.getDefaultAnimation() ?? null)
</script>
