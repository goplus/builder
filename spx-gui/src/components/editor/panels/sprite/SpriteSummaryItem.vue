<template>
  <PanelSummaryItem>
    <UIImg class="img" :src="imgSrc" />
  </PanelSummaryItem>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import PanelSummaryItem from '../common/PanelSummaryItem.vue'

const props = defineProps<{
  sprite: Sprite
}>()

const [imgSrc] = useFileUrl(() => props.sprite.defaultCostume?.img)
</script>

<style lang="scss" scoped>
.img {
  width: 36px;
  height: 36px;
}
</style>
