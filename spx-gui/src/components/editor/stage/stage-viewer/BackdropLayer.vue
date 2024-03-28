<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 16:33:54
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-29 09:10:48
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
    <v-image
      v-if="image"
      :config="{
        image: image,
        width: props.mapSize.width,
        height: props.mapSize.height
      }"
    ></v-image>
    <v-rect
      :config="{
        width: props.mapSize.width,
        height: props.mapSize.height,
        stroke: 'pink',
        strokeWidth: 2
      }"
    >
    </v-rect>
    <v-line
      :config="{
        points: [props.mapSize.width / 2, 0, props.mapSize.width / 2, props.mapSize.height],
        stroke: 'pink',
        strokeWidth: 2
      }"
    ></v-line>
    <v-line
      :config="{
        points: [0, props.mapSize.height / 2, props.mapSize.width, props.mapSize.height / 2],
        stroke: 'pink',
        strokeWidth: 2
      }"
    ></v-line>
  </v-layer>
</template>
<script setup lang="ts">
import { defineProps, watch, ref } from 'vue'
import type { Stage } from '@/models/stage'
import type { Size } from '@/models/common'

const props = defineProps<{
  offsetConfig: { offsetX: number; offsetY: number }
  mapSize: Size
  stage: Stage
}>()

const image = ref<HTMLImageElement>()

watch(
  () => props.stage.backdrop?.img,
  async (backdropImg) => {
    image.value?.remove()
    if (backdropImg != null) {
      const _image = new window.Image()
      _image.src = await backdropImg.url()
      image.value = _image
    }
  },
  { immediate: true }
)
</script>
