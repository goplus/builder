<template>
  <PanelItem
    :active="active"
    :name="props.sprite.name"
    @remove="emit('remove')"
    @add-to-asset-library="emit('addToAssetLibrary')"
  >
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
  </PanelItem>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import PanelItem from '../common/PanelItem.vue'

const props = defineProps<{
  sprite: Sprite
  active: boolean
}>()

const emit = defineEmits<{
  remove: []
  addToAssetLibrary: []
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.sprite.defaultCostume?.img)
</script>

<style lang="scss" scoped>
.img {
  width: 60px;
  height: 60px;
}
</style>
