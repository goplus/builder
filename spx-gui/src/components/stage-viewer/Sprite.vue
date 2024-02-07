<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:48:38
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 10:24:34
 * @FilePath: /spx-gui/src/components/stage-viewer/Sprite.vue
 * @Description: 
-->
<template>
    <Costume @on-drag-end="onDragEnd" :sprite_config="sprite_config" :costume_config="currentCostume"
        :map_config="map_config"></Costume>
</template>
<script lang="ts" setup>
import Costume from "./Costume.vue"
import { defineProps, onMounted, computed, defineEmits, type ComputedRef } from "vue"
import type { StageSprite, StageCostume, mapConfig, spriteDragEndTarget } from ".";

// ----------props & emit------------------------------------
const props = defineProps<{
    sprite_config: StageSprite
    map_config: mapConfig
}>();

// when ths costume dragend,emit the sprite position
const emits = defineEmits<{
    (e: 'onDragEnd', event: spriteDragEndTarget): void
}>()

// ----------computed properties-----------------------------
// computed the current costume with current image
const currentCostume: ComputedRef<StageCostume> = computed(() => {
    return props.sprite_config.costumes[props.sprite_config.costumeIndex]
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
const onDragEnd = (e: spriteDragEndTarget) => {
    emits("onDragEnd", e)
}
</script>
