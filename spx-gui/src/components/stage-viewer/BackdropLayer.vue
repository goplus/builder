<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 16:33:54
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 17:18:32
 * @FilePath: /spx-gui/src/components/stage-viewer/BackdropLayer.vue
 * @Description
-->
<template>
    <v-layer :config="{
        x: props.offsetConfig.offsetX,
        y: props.offsetConfig.offsetY,
    }">

        <v-line :config="{
            points: [props.mapConfig.width / 2, 0, props.mapConfig.width / 2, props.mapConfig.height],
            stroke: 'pink',
            strokeWidth: 1,
        }"></v-line>
        <v-line :config="{
            points: [0, props.mapConfig.height / 2, props.mapConfig.width, props.mapConfig.height / 2],
            stroke: 'pink',
            strokeWidth: 1,
        }"></v-line>
        <v-image v-if="image" :config="{
            image: image,
        }"></v-image>
    </v-layer>
</template>

<script setup lang="ts">
import { defineProps, watch, ref, defineEmits } from 'vue'
import type { MapConfig, StageBackdrop } from "./index"

const emits = defineEmits<{
    // when ths costume dragend,emit the sprite position
    (e: 'onSceneLoadend', event: { imageEl: HTMLImageElement }): void
}>()


const props = defineProps<{
    offsetConfig: { offsetX: number, offsetY: number },
    mapConfig: MapConfig,
    backdropConfig?: StageBackdrop
}>()

const image = ref<HTMLImageElement>()

watch(() => props.backdropConfig, (_new, _old) => {
    if (_new && _new.scenes.length != 0) {
        const _image = new window.Image();
        _image.src = _new.scenes[_new.sceneIndex].url
        _image.onload = () => {
            image.value = _image;
            emits('onSceneLoadend', { imageEl: _image })
        };
    } else {
        image.value?.remove();
    }
})

</script>