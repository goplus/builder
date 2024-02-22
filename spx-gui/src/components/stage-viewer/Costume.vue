<!-- eslint-disable vue/multi-word-component-names -->
<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 14:19:57
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-22 11:56:46
 * @FilePath: \spx-gui\src\components\stage-viewer\Costume.vue
 * @Description: 
-->
<template>
  <v-image
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    :config="{
      spriteName: props.spriteConfig.name,
      image: image,
      draggable: true,
      x: spritePosition.x,
      y: spritePosition.y,
      rotation: spriteRotation,
      offsetX: currentCostume.x,
      offsetY: currentCostume.y,
      scaleX: props.spriteConfig.config.size,
      scaleY: props.spriteConfig.config.size
    }"
  />
  <v-rect
    v-if="props.selected"
    ref="transformer"
    @dragend="handleDragEnd"
    :config="{
      spriteName: props.spriteConfig.name,
      width: image?.width,
      height: image?.height,
      fill: 'rgba(0,0,0,0)',
      strokeWidth: 4,
      draggable: true,
      x: spritePosition.x,
      y: spritePosition.y,
      rotation: spriteRotation,
      offsetX: currentCostume.x,
      offsetY: currentCostume.y,
      scaleX: props.spriteConfig.config.size,
      scaleY: props.spriteConfig.config.size
    }"
  >
  </v-rect>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineProps, onMounted, ref, computed, watchEffect, onUnmounted, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { StageCostume, MapConfig, SpriteDragEndTarget } from './index'
import type { KonvaEventObject, Node } from 'konva/lib/Node'
import type { Shape } from 'konva/lib/Shape'
import type { Sprite as SpriteConfig } from '@/class/sprite'
import type { Costume as CostumeConfig } from '@/interface/file'
// ----------props & emit------------------------------------
const props = defineProps<{
  spriteConfig: SpriteConfig
  mapConfig: MapConfig
  selected: boolean
}>()
// define the emits
const emits = defineEmits<{
  // when ths costume dragend,emit the sprite position
  (e: 'onDragEnd', event: { sprite: SpriteConfig }): void
}>()

// ----------computed properties-----------------------------
// computed the current costume with current image
const currentCostume: ComputedRef<CostumeConfig> = computed(() => {
  console.log(props.spriteConfig.config.costumes)
  console.log(props.spriteConfig.config.costumes[props.spriteConfig.config.costumeIndex])
  return props.spriteConfig.config.costumes[props.spriteConfig.config.costumeIndex]
})

// ----------data related -----------------------------------
const image = ref<HTMLImageElement>()
const transformer = ref<Rect>()
// ----------computed properties-----------------------------
// Computed spx's sprite position to konva's relative position by about changing sprite postion
const spritePosition = computed(() => {
  return getRelativePosition(props.spriteConfig.config.x, props.spriteConfig.config.y)
})

// Computed spx's sprite heading to konva's rotation by about changing sprite heading
const spriteRotation = computed(() => {
  return getRotation(props.spriteConfig.config.heading)
})

watch(
  () => currentCostume.value,
  (new_costume, old_costume) => {
    console.log(new_costume, old_costume)
    if (new_costume != null) {
      const _image = new window.Image()
      _image.src = props.spriteConfig.files[props.spriteConfig.config.costumeIndex].url as string
      _image.onload = () => {
        image.value = _image
        console.log(_image.width, _image.height)
      }
    } else {
      image.value?.remove()
    }
  },
  {
    immediate: true
  }
)

// ----------methods-----------------------------------------
/**
 * @description: map spx's sprite position to konva's relative position
 * @param {*} x
 * @param {*} y
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 14:52:50
 */
const getRelativePosition = (x: number, y: number): { x: number; y: number } => {
  // 返回计算后的位置  stage.width / 2 + x ，stage.height / 2 + y
  return {
    x: props.mapConfig.width / 2 + x,
    y: props.mapConfig.height / 2 - y
  }
}

/**
 * @description: map spx's sprite heading to konva's rotation
 * @param {*} heading
 * @return {*}
 */
const getRotation = (heading: number): number => {
  return heading - 90
}

/**
 * @description: map konva's relative postion to spx's position
 * @param {*} x
 * @param {*} y
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:28:36
 */
const getSpxPostion = (x: number, y: number): { x: number; y: number } => {
  return {
    x: x - props.mapConfig.width / 2,
    y: props.mapConfig.height / 2 - y
  }
}

const handleDragMove = (event) => {
  if (transformer.value) {
    transformer.value.getNode().setPosition({
      x: event.target.attrs.x,
      y: event.target.attrs.y
    })
  }
}

/**
 * @description: when ths costume dragend,map and emit the sprite position
 * @param {*} event
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:44:18
 */
const handleDragEnd = (event: { target: { attrs: { x: number; y: number } } }) => {
  const position = getSpxPostion(event.target.attrs.x, event.target.attrs.y)
  props.spriteConfig.config.x = position.x
  props.spriteConfig.config.y = position.y
  emits('onDragEnd', {
    sprite: props.spriteConfig
  })
}
</script>