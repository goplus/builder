<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 16:33:54
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 10:53:32
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
import { defineProps, watch, ref, defineEmits } from 'vue'
import type { mapConfig, StageBackdrop} from "./index"

const emits = defineEmits<{
    // when ths costume dragend,emit the sprite position
    (e: 'onSceneLoadend', event: { imageEl: HTMLImageElement }): void
}>()


const props = defineProps<{
    offset_config: { offsetX: number, offsetY: number },
    map_config: mapConfig,
    backdrop_config?: StageBackdrop
}>()

const image = ref<HTMLImageElement>()

watch(() => props.backdrop_config, (_new, _old) => {
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