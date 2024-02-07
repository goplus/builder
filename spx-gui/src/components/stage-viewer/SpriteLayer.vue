<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 16:13:37
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 16:40:01
 * @FilePath: /spx-gui/src/components/stage-viewer/SpriteLayer.vue
 * @Description: 
-->
<template>
    <v-layer :config="{
        x: props.offsetConfig.offsetX,
        y: props.offsetConfig.offsetY
    }">
        <template v-if="!props.loading">
            <template v-for="sprite in props.sprites">
                <Sprite @onDragEnd="onSpriteDragEnd" v-if="isVisibleInStage(sprite)" :mapConfig="props.mapConfig"
                    :key="sprite.name" :spriteConfig="sprite" />
            </template>
        </template>
    </v-layer>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import type { StageSprite, MapConfig, SpriteDragEndTarget, SpriteDragEndEvent } from ".";
import Sprite from "./Sprite.vue"
import { computed } from "vue";

const props = defineProps<{
    loading: boolean,
    offsetConfig: { offsetX: number, offsetY: number },
    mapConfig: MapConfig
    sprites: StageSprite[]
    currentSpriteNames: string[]
}>()

const isVisibleInStage = (sprite: StageSprite) => {
    return props.currentSpriteNames.includes(sprite.name) && sprite.visible
}

// ----------methods-----------------------------------------
const emits = defineEmits<{
    (e: 'onSpritesDragEnd', value: SpriteDragEndEvent): void
}>()

/**
 * @description: Single sprite drag end
 * @param {*} e
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:47:53
 */
const onSpriteDragEnd = (e: SpriteDragEndTarget) => {
    emits('onSpritesDragEnd', {
        targets: [e]
    })
}
</script>