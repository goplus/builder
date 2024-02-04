<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:48:38
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-26 16:49:16
 * @FilePath: /spx-gui/src/components/spx-stage/Sprite.vue
 * @Description: 
-->
<template>
    <Costume @on-drag-end="onDragEnd" :sprite_config="{
        x: currentCostume.sx as number,
        y: currentCostume.sy as number,
        heading: currentCostume.heading,
        size:currentCostume.size,
    }" :costume_config="{
    x: currentCostume.cx as number,
    y: currentCostume.cy as number,
    url:currentCostume.url as string
}"></Costume>
</template>
<script lang="ts" setup>
// TODO:use the interface from filemanager
import type { SpriteConfig, Costume as CostumeConfig } from "@/interface/file";
import SpriteType from "@/class/sprite"

import Costume from "./Costume.vue"
import { defineProps, onMounted, computed, defineEmits, type ComputedRef } from "vue"

// ----------props & emit------------------------------------
const props = defineProps<{
    config: SpriteType;
}>();

// when ths costume dragend,emit the sprite position
const emits = defineEmits<{
    (e: 'onDragEnd', spirte: { x: number, y: number; }): void
}>()


// ----------computed properties-----------------------------
// computed the current costume with current image
const currentCostume: ComputedRef<CostumeConfig & SpriteConfig> = computed(() => {
    console.log(props.config)
    return props.config.currentCostumeConfig
})

onMounted(() => {
    console.log(props.config)
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
const onDragEnd = (e: { x: number, y: number }) => {
    emits("onDragEnd", e)
}
</script>
