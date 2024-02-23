<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 16:13:37
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-23 12:05:48
 * @FilePath: \spx-gui\src\components\stage-viewer\SpriteLayer.vue
 * @Description: 
-->
<template>
  <v-layer
    ref="layer"
    :config="{
      name: 'sprite',
      x: props.offsetConfig.offsetX,
      y: props.offsetConfig.offsetY
    }"
  >
    <template v-for="sprite in sortedSprites" :key="sprite.name">
      <Sprite
        v-if="sprite.config.visible"
        @onDragMove="onSpriteDragMove"
        :spriteConfig="sprite"
        :mapConfig="props.mapConfig"
        :selected="selectedSpriteNames.includes(sprite.name)"
      >
      </Sprite>
    </template>
  </v-layer>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import Sprite from './Sprite.vue'
import { computed } from 'vue'
import type { SpriteDragMoveEvent, MapConfig } from './common'
import type { Sprite as SpriteConfig } from '@/class/sprite'

const props = defineProps<{
  offsetConfig: { offsetX: number; offsetY: number }
  mapConfig: MapConfig
  spriteList: SpriteConfig[]
  zorder: string[]
  selectedSpriteNames: string[]
}>()
const emits = defineEmits<{
  (e: 'onSpriteDragMove', event: SpriteDragMoveEvent): void
}>()

// spritelist sort by zorder config
const sortedSprites = computed(() => {
  const spriteMap = new Map<string, SpriteConfig>()
  props.spriteList.forEach((sprite) => {
    spriteMap.set(sprite.name, sprite)
  })
  const list: SpriteConfig[] = []
  props.zorder.forEach((name) => {
    if (spriteMap.has(name)) {
      list.push(spriteMap.get(name) as SpriteConfig)
    }
  })
  console.log(props.zorder)
  return list
})

const onSpriteDragMove = (e: SpriteDragMoveEvent) => {
  emits('onSpriteDragMove', e)
}
</script>