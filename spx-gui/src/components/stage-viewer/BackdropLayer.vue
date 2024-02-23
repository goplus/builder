<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 16:33:54
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-23 12:16:47
 * @FilePath: \spx-gui\src\components\stage-viewer\BackdropLayer.vue
 * @Description
-->
<template>
  <v-layer
    :config="{
      name: 'backdrop',
      x: props.offsetConfig.offsetX,
      y: props.offsetConfig.offsetY
    }"
  >
    <v-rect
      :config="{
        width: props.mapConfig.width,
        height: props.mapConfig.height,
        stroke: 'pink',
        strokeWidth: 1
      }"
    >
    </v-rect>
    <v-line
      :config="{
        points: [props.mapConfig.width / 2, 0, props.mapConfig.width / 2, props.mapConfig.height],
        stroke: 'pink',
        strokeWidth: 1
      }"
    ></v-line>
    <v-line
      :config="{
        points: [0, props.mapConfig.height / 2, props.mapConfig.width, props.mapConfig.height / 2],
        stroke: 'pink',
        strokeWidth: 1
      }"
    ></v-line>
    <v-image
      v-if="image"
      :config="{
        image: image
      }"
    ></v-image>
  </v-layer>
</template>
<script setup lang="ts">
import { defineProps, watch, ref, defineEmits, computed } from 'vue'
import type { MapConfig, StageBackdrop } from './common'
import type { Backdrop } from '@/class/backdrop'

const emits = defineEmits<{
  // when ths costume dragend,emit the sprite position
  (e: 'onSceneLoadend', event: { imageEl: HTMLImageElement }): void
}>()

const props = defineProps<{
  offsetConfig: { offsetX: number; offsetY: number }
  mapConfig: MapConfig
  backdropConfig: Backdrop
}>()

const image = ref<HTMLImageElement>()

const backdrop = computed(() => {
  const { files, config } = props.backdropConfig
  return props.backdropConfig.config.map
    ? null
    : ({
        scenes:
          config.scenes?.map((scene, index) => ({
            name: scene.name as string,
            url: files[index].url as string
          })) || [],
        costumes:
          config.costumes?.map((costume, index) => ({
            name: costume.name as string,
            url: files[index].url as string,
            x: costume.x || 0,
            y: costume.y || 0
          })) || [],
        currentCostumeIndex: config.currentCostumeIndex || 0
      } as StageBackdrop)
})

watch(
  () => backdrop.value,
  (new_config, old_config) => {
    if (new_config) {
      // In the scene config‘s project, you only need to get the first scene as the backdrop
      const _image = new window.Image()
      if (new_config.scenes.length != 0) {
        _image.src = new_config.scenes[0].url
      } else if (new_config.costumes.length != 0) {
        _image.src = new_config.costumes[new_config.currentCostumeIndex].url
      }
      _image.onload = () => {
        image.value = _image
        emits('onSceneLoadend', { imageEl: _image })
      }
    } else {
      image.value?.remove()
    }
  }
)
</script>
