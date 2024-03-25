<!-- eslint-disable vue/multi-word-component-names -->
<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:48:38
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-13 14:31:03
 * @FilePath: \spx-gui\src\components\stage-viewer\Sprite.vue
 * @Description: 
-->
<template>
  <Costume
    :sprite="props.sprite"
    :selected="props.selected"
    :map-size="props.mapSize"
    @on-drag-move="onDragMove"
    @on-apperance-change="onApperanceChange"
  >
  </Costume>
</template>
<script lang="ts" setup>
import Costume from './Costume.vue'
import { defineProps, defineEmits } from 'vue'
import type { Sprite } from '@/model/sprite'
import type { Size } from '@/model/common'
import type { SpriteDragMoveEvent, SpriteApperanceChangeEvent } from './common'
// ----------props & emit------------------------------------

const props = defineProps<{
  sprite: Sprite
  mapSize: Size
  selected: boolean
}>()

const emits = defineEmits<{
  // when ths costume dragmove,emit the sprite position
  (e: 'onDragMove', event: SpriteDragMoveEvent): void
  (e: 'onSpriteApperanceChange', event: SpriteApperanceChangeEvent): void
}>()

const onDragMove = (e: SpriteDragMoveEvent): void => {
  emits('onDragMove', e)
}

const onApperanceChange = (e: SpriteApperanceChangeEvent): void => {
  emits('onSpriteApperanceChange', e)
}
</script>
