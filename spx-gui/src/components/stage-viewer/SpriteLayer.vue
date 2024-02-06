<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 16:13:37
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-06 14:52:55
 * @FilePath: /spx-gui/src/components/stage-viewer/SpriteLayer.vue
 * @Description: 
-->
<template>
    <v-layer :config="{
        x: offset_config.offsetX,
        y: offset_config.offsetY
    }">
        <template v-for="sprite in props.sprites">
            <Sprite @on-drag-end="onSpriteDragEnd" v-if="sprite.stageVisible" :map_config="map_config" :key="sprite.id"
                :sprite_config="sprite" />
        </template>
    </v-layer>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import type { StageSprite, mapConfig, spriteDragEndTarget, spriteDragEndEvent } from ".";
import Sprite from "./Sprite.vue"
import { ref, computed, onMounted } from "vue"

const props = defineProps<{
    offset_config: { offsetX: number, offsetY: number },
    map_config: mapConfig
    sprites: StageSprite[]
}>()


// ----------methods-----------------------------------------
const emits = defineEmits<{
    (e: 'onSpritesDragEnd', value: spriteDragEndEvent): void
}>()

/**
 * @description: Single sprite drag end
 * @param {*} e
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:47:53
 */
const onSpriteDragEnd = (e: spriteDragEndTarget) => {
    emits('onSpritesDragEnd', {
        targets: [e]
    })
}
</script>