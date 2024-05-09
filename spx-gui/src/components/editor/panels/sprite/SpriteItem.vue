<template>
  <PanelItem :active="active" :name="props.sprite.name" :loading="!imgSrc" @remove="emit('remove')">
    <div class="img" :style="imgStyle"></div>
  </PanelItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import PanelItem from '../common/PanelItem.vue'

const props = defineProps<{
  sprite: Sprite
  active: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()

const imgSrc = useFileUrl(() => props.sprite.costume?.img)
const imgStyle = computed(() => imgSrc.value && { backgroundImage: `url("${imgSrc.value}")` })
</script>

<style lang="scss" scoped>
.img {
  width: 60px;
  height: 60px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}
</style>
