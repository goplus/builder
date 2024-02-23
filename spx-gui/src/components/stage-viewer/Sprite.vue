<!-- eslint-disable vue/multi-word-component-names -->
<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:48:38
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-23 14:31:21
 * @FilePath: \spx-gui\src\components\stage-viewer\Sprite.vue
 * @Description: 
-->
<template>
  <Costume
    :sprite-config="props.spriteConfig"
    :selected="props.selected"
    :map-config="props.mapConfig"
    @on-drag-move="onDragMove"
  >
  </Costume>
</template>
<script lang="ts" setup>
import Costume from './Costume.vue'
import { defineProps, defineEmits } from 'vue'
import type { Sprite as SpriteConfig } from '@/class/sprite'
import type { SpriteDragMoveEvent, MapConfig } from './common'
// ----------props & emit------------------------------------
const props = defineProps<{
  spriteConfig: SpriteConfig
  mapConfig: MapConfig
  selected: boolean
}>()

const emits = defineEmits<{
  // when ths costume dragend,emit the sprite position
  (e: 'onDragMove', event: SpriteDragMoveEvent): void
}>()

const onDragMove = (e: SpriteDragMoveEvent): void => {
  emits('onDragMove', e)
}
</script>
