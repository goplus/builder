<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 16:13:37
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-02-05 11:16:22
 * @FilePath: /spx-gui/src/components/spx-stage/SpriteLayer.vue
 * @Description: 
-->
<template>
    <v-layer>
        <Sprite v-if="spriteStore.current" @on-drag-end="onSpriteDragEnd"  :config="spriteStore.current" />
    </v-layer>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import Sprite from "./Sprite.vue"
import { ref, computed,onMounted } from "vue"
// todo:use the filemanager's interface of spirteConfig
// import { useSpriteStore } from "@/store";
// const spriteStore = useSpriteStore()
const spriteStore = {current:''}

onMounted(()=>{
    console.log(spriteStore.current)
})
// ----------methods-----------------------------------------

/**
 * @todo set to store
 * @description: When the sprite is dragged, update the sprite's position to the store
 * @param {*} e
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:47:53
 */
const onSpriteDragEnd = (e: { x: number, y: number }) => {
    // spriteStore.current?.setSx(e.x)
    // spriteStore.current?.setSy(e.y)
}
</script>