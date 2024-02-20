<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 16:33:54
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-20 15:53:21
 * @FilePath: /spx-gui/src/components/stage-viewer/BackdropLayer.vue
 * @Description
-->
<template>
    <v-layer :config="{
        name: 'backdrop',
        x: props.offsetConfig.offsetX,
        y: props.offsetConfig.offsetY,
    }">
        <v-rect :config="{
            width: props.mapConfig.width,
            height: props.mapConfig.height,
            stroke: 'pink',
            strokeWidth: 1,
        }">

        </v-rect>
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
    backdropConfig: StageBackdrop | null
}>()

const image = ref<HTMLImageElement>()

watch(() => props.backdropConfig, (new_config, old_config) => {
    if (new_config) {
        // In the scene config‘s project, you only need to get the first scene as the backdrop
        const _image = new window.Image();
        if (new_config.scenes.length != 0) {
            _image.src = new_config.scenes[0].url
        } else if (new_config.costumes.length != 0) {
            _image.src = new_config.costumes[new_config.currentCostumeIndex].url
        }
        _image.onload = () => {
            image.value = _image;
            emits('onSceneLoadend', { imageEl: _image })
        };
    }
    else {
        image.value?.remove();
    }
})

</script>