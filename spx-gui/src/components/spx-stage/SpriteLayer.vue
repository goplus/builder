<template>
    <v-layer>
        <Sprite @on-drag-end="onSpriteDragEnd" :config="currentSprite" />
    </v-layer>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import Sprite from "./Sprite.vue"
import { ref, computed } from "vue"
// todo:use the filemanager's interface of spirteConfig
import type { SpriteConfig } from "@/store"


// ----------computed properties-----------------------------

// TODO: get current sprite from store
// computed the current sprite config info from store
const currentSprite = computed<SpriteConfig>(() => {
    return {
        name: "calf-1",
        visible: true,
        size: 1,
        x: 0,
        y: 0,
        heading: 90,
        costumeIndex: 0,
        costumes: [{
            path: "calf-1.png",
            x: 0,
            y: 0
        }, {
            path: "calf-1.png",
            x: 50,
            y: 50
        }]
    }
    // return spriteStore.current
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
}
</script>