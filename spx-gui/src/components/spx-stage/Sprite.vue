<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:48:38
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-25 17:43:54
 * @FilePath: /builder/spx-gui/src/components/spx-stage/Sprite.vue
 * @Description: 
-->
<template>
    <Costume @on-drag-end="onDragEnd" :sprite_config="{
        x: props.config.x,
        y: props.config.y,
        heading: props.config.heading
    }" :costume_config="{
    x: currentCostume.x,
    y: currentCostume.y
}"></Costume>
</template>
<script lang="ts" setup>
// TODO:use the interface from filemanager
import { CostumeConfig, SpriteConfig } from "@/store";
import Costume from "./Costume.vue"
import { defineProps, onMounted, computed, defineEmits, ComputedRef } from "vue"

// ----------props & emit------------------------------------
const props = defineProps<{
    config: SpriteConfig;
}>();

// when ths costume dragend,emit the sprite position
const emits = defineEmits<{
    (e: 'onDragEnd', spirte: { x: number, y: number; }): void
}>()


// ----------computed properties-----------------------------
// computed the current costume
const currentCostume: ComputedRef<CostumeConfig> = computed(() => {
    return props.config.costumes[props.config.costumeIndex]
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