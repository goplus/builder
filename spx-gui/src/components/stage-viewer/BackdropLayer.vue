<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 16:33:54
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-06 11:18:31
 * @FilePath: /spx-gui/src/components/stage-viewer/BackdropLayer.vue
 * @Description
-->
<template>
    <v-layer :config="{
        x: offset_config.offsetX,
        y: offset_config.offsetY
    }">
        <v-rect :config="{
            width: map_config.width,
            height: map_config.height,
            fill: '#eb65a9',
        }"></v-rect>
        <v-line :config="{
            points: [map_config.width / 2, 0, map_config.width / 2, map_config.height],
            stroke: 'pink',
            strokeWidth: 1,
        }"></v-line>
        <v-line :config="{
            points: [0, map_config.height / 2, map_config.width, map_config.height / 2],
            stroke: 'pink',
            strokeWidth: 1,
        }"></v-line>
    </v-layer>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import type { mapConfig } from "./index"
const props = defineProps<{
    offset_config: { offsetX: number, offsetY: number },
    map_config: mapConfig
}>()
</script>