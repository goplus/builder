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
  </v-layer>
</template>
<script setup lang="ts">
import { defineProps } from 'vue'
import { useImgFile } from '@/utils/file'
import type { Stage } from '@/models/stage'
import type { Size } from '@/models/common'

const props = defineProps<{
  offsetConfig: { offsetX: number; offsetY: number }
  mapSize: Size
  stage: Stage
}>()

const image = useImgFile(() => props.stage.backdrop?.img)
</script>
