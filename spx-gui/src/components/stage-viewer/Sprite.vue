<!-- eslint-disable vue/multi-word-component-names -->
<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:48:38
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-21 17:33:10
 * @FilePath: /builder/spx-gui/src/components/stage-viewer/Sprite.vue
 * @Description: 
-->
<template>
    <Costume @onDragEnd="onDragEnd" :spriteConfig="spriteConfig" :mapConfig="mapConfig">
    </Costume>
</template>
<script lang="ts" setup>
import Costume from "./Costume.vue"
import { defineProps, computed, defineEmits, type ComputedRef } from "vue"
import type { StageSprite, StageCostume, MapConfig, SpriteDragEndTarget } from ".";
import type { Sprite as SpriteConfig } from "@/class/sprite"
// ----------props & emit------------------------------------
const props = defineProps<{
    spriteConfig: SpriteConfig
    mapConfig: MapConfig
}>();

// when ths costume dragend,emit the sprite position
const emits = defineEmits<{
    (e: 'onDragEnd', event: { sprite: SpriteConfig }): void
}>()



// ----------methods-----------------------------------------

/**
 * @description: function about the costume is dragged
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:39:27
 */
const onDragEnd = (e: { sprite: SpriteConfig }) => {
    emits("onDragEnd", e)
}
</script>
