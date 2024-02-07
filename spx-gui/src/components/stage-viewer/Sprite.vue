<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:48:38
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 12:14:11
 * @FilePath: /spx-gui/src/components/stage-viewer/Sprite.vue
 * @Description: 
-->
<template>
    <Costume @onDragEnd="onDragEnd" :spriteConfig="spriteConfig" :costumeConfig="currentCostume" :mapConfig="mapConfig">
    </Costume>
</template>
<script lang="ts" setup>
import Costume from "./Costume.vue"
import { defineProps, computed, defineEmits, type ComputedRef } from "vue"
import type { StageSprite, StageCostume, MapConfig, SpriteDragEndTarget } from ".";

// ----------props & emit------------------------------------
const props = defineProps<{
    spriteConfig: StageSprite
    mapConfig: MapConfig
}>();

// when ths costume dragend,emit the sprite position
const emits = defineEmits<{
    (e: 'onDragEnd', event: SpriteDragEndTarget): void
}>()

// ----------computed properties-----------------------------
// computed the current costume with current image
const currentCostume: ComputedRef<StageCostume> = computed(() => {
    return props.spriteConfig.costumes[props.spriteConfig.costumeIndex]
})

// ----------methods-----------------------------------------

/**
 * @description: function about the costume is dragged
 * @param {*} e
 * @param {*} y
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:39:27
 */
const onDragEnd = (e: SpriteDragEndTarget) => {
    emits("onDragEnd", e)
}
</script>
