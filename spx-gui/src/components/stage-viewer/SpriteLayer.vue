<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 16:13:37
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-05 16:36:49
 * @FilePath: /spx-gui/src/components/stage-viewer/SpriteLayer.vue
 * @Description: 
-->
<template>
    <v-layer>
        <Sprite v-for="sprite in props.sprites" :map_config="map_config" :key="sprite.id" :sprite_config="sprite" />"
        <!-- <Sprite :map_config="map_config" :sprite_config="sprite_config" /> -->
    </v-layer>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import type { StageSprite, mapConfig } from ".";
import Sprite from "./Sprite.vue"
import { ref, computed, onMounted } from "vue"
// todo:use the filemanager's interface of spirteConfig

const props = defineProps<{
    map_config: mapConfig
    sprites: StageSprite[]
}>()

// onMounted(()=>{
//     console.log(spriteStore.current)
// })
// ----------methods-----------------------------------------

/**
 * @todo set to store
 * @description: When the sprite is dragged, update the sprite's position to the store
 * @param {*} e
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:47:53
 */
// const onSpriteDragEnd = (e: { x: number, y: number }) => {
//     spriteStore.current?.setSx(e.x)
//     spriteStore.current?.setSy(e.y)
// }
</script>