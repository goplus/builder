<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 16:13:37
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-20 15:04:03
 * @FilePath: /spx-gui/src/components/stage-viewer/SpriteLayer.vue
 * @Description: 
-->
<template>
    <v-layer :config="{
        name: 'sprite',
        x: props.offsetConfig.offsetX,
        y: props.offsetConfig.offsetY
    }">
        <template v-for="sprite in props.sprites" :key="sprite.name">
                <Sprite  @onDragEnd="onSpriteDragEnd" v-if="isVisibleInStage(sprite)" :mapConfig="props.mapConfig"
                     :spriteConfig="sprite" />
        </template>
    </v-layer>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import type { StageSprite, MapConfig, SpriteDragEndTarget, SpriteDragEndEvent } from '.'
import Sprite from './Sprite.vue'

const props = defineProps<{
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
