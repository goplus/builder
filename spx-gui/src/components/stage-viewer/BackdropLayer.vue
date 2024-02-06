<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 16:33:54
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-06 18:05:05
 * @FilePath: /spx-gui/src/components/stage-viewer/BackdropLayer.vue
 * @Description
-->
<template>
    <v-layer :config="{
        x: offset_config.offsetX,
        y: offset_config.offsetY,
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
        <v-image v-if="image" :config="{
            image: image,
        }"></v-image>
    </v-layer>
</template>

<script setup lang="ts">
import { defineProps, watchEffect, onMounted, onUnmounted, watch, ref } from 'vue'
import type { mapConfig, StageBackdrop } from "./index"

const image = ref<HTMLImageElement>()

const props = defineProps<{
    offset_config: { offsetX: number, offsetY: number },
    map_config: mapConfig,
    backdrop_config?: StageBackdrop
}>()

// TODO: Another way to get the stage size determined by the background to reduce redundancy
watch(() => props.backdrop_config, (_new, _old) => {
    if (_new && _new.scenes.length != 0) {
        const _image = new window.Image();
        _image.src = _new.scenes[_new.sceneIndex].url
        console.log(_image)
        _image.onload = () => {
            image.value = _image;
            console.log(_image.width, _image.height)
        };
    }
})




</script>