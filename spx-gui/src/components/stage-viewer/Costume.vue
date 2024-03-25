<!-- eslint-disable vue/multi-word-component-names -->
<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 14:19:57
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-13 15:08:38
 * @FilePath: \spx-gui\src\components\stage-viewer\Costume.vue
 * @Description: 
-->
<template>
  <v-image
    ref="costume"
    :config="{
      spriteName: props.sprite.name,
      image: image,
      draggable: true,
      x: spritePosition.x,
      y: spritePosition.y,
      rotation: spriteRotation,
      offsetX: currentCostume?.config.x,
      offsetY: currentCostume?.config.y,
      scaleX: props.sprite.config.size,
      scaleY: props.sprite.config.size,
      visible: props.sprite.config.visible
    }"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
  />
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineProps, ref, computed, watch } from 'vue'
import type { KonvaEventObject, Node } from 'konva/lib/Node'
import type { Sprite } from '@/model/sprite'
import type { SpriteDragMoveEvent, SpriteApperanceChangeEvent } from './common'
import type { Rect } from 'konva/lib/shapes/Rect'
import type { Size } from '@/model/common'
// ----------props & emit------------------------------------
const props = defineProps<{
  sprite: Sprite
  mapSize: Size
  selected: boolean
}>()
// define the emits
const emits = defineEmits<{
  // when ths costume dragend,emit the sprite position
  (e: 'onDragMove', event: SpriteDragMoveEvent): void
  (e: 'onApperanceChange', event: SpriteApperanceChangeEvent): void
}>()

// ----------computed properties-----------------------------
// computed the current costume with current image
const currentCostume = computed(() => props.sprite.costume)

// ----------data related -----------------------------------
const image = ref<HTMLImageElement>()
const costume = ref()
// ----------computed properties-----------------------------
// Computed spx's sprite position to konva's relative position by about changing sprite postion
const spritePosition = computed(() => {
  // TODO: check default values here
  return getRelativePosition(props.sprite.config.x, props.sprite.config.y)
})

// Computed spx's sprite heading to konva's rotation by about changing sprite heading
const spriteRotation = computed(() => {
  // TODO: check default values here
  return getRotation(props.sprite.config.heading)
})

// When the config update,emits the apperance change event
// TODO: Move to stageviewer to listen for config changes
watch(
  () => props.sprite,
  () => {
    emits('onApperanceChange', {
      sprite: props.sprite,
      node: costume.value.getNode() as Node
    })
  },
  {
    deep: true
  }
)

watch(
  () => currentCostume.value,
  (new_costume) => {
    if (new_costume != null) {
      const _image = new window.Image()
      _image.src = new_costume.img.url()
      _image.onload = () => {
        image.value = _image
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
    x: props.mapSize.width / 2 + x,
    y: props.mapSize.height / 2 - y
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
    x: x - props.mapSize.width / 2,
    y: props.mapSize.height / 2 - y
  }
}
const controller = ref<Rect | null>()

// This function is only used to design communication,
// and the actual work of modifying the doms value is placed in the dragend event
const handleDragMove = (event: KonvaEventObject<MouseEvent>) => {
  emits('onDragMove', {
    event,
    sprite: props.sprite
  })
}

/**
 * @description: when ths costume dragend,map and set the sprite position
 * @param {*} event
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:44:18
 */
const handleDragEnd = (event: { target: { attrs: { x: number; y: number } } }) => {
  const { x, y } = getSpxPostion(event.target.attrs.x, event.target.attrs.y)
  props.sprite.setConfig({ x, y })
  controller.value = null
}
</script>
