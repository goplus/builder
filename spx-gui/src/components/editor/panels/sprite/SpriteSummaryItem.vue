<template>
  <PanelSummaryItem>
    <div class="img" :style="imgStyle"></div>
  </PanelSummaryItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import PanelSummaryItem from '../common/PanelSummaryItem.vue'

const props = defineProps<{
  sprite: Sprite
}>()

const imgSrc = useFileUrl(() => props.sprite.costume?.img)
const imgStyle = computed(() => imgSrc.value && { backgroundImage: `url("${imgSrc.value}")` })
</script>

<style lang="scss" scoped>
.img {
  width: 36px;
  height: 36px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}
</style>
