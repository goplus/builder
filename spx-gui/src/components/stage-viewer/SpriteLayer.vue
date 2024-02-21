<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 16:13:37
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-21 17:41:06
 * @FilePath: /builder/spx-gui/src/components/stage-viewer/SpriteLayer.vue
 * @Description: 
-->
<template>
    <v-layer :config="{
        name: 'sprite',
        x: props.offsetConfig.offsetX,
        y: props.offsetConfig.offsetY
    }">
        <template v-for="sprite in sortedSprites" :key="sprite.name">
            <Sprite v-if="sprite.config.visible" @onDragEnd="onSpriteDragEnd" :mapConfig="props.mapConfig"
                :spriteConfig="sprite" />
        </template>
    </v-layer>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import type { StageSprite, MapConfig, SpriteDragEndTarget, SpriteDragEndEvent } from ".";
import Sprite from "./Sprite.vue"
import type { Sprite as SpriteConfig } from "@/class/sprite"
import { computed } from "vue";
import type { ComputedRef } from "vue"

const props = defineProps<{
    offsetConfig: { offsetX: number, offsetY: number },
    mapConfig: MapConfig
    spriteList: SpriteConfig[]
    zorder: string[]
}>()

const sortedSprites = computed(() => {
    const spriteMap = new Map<string, SpriteConfig>();
    props.spriteList.forEach(sprite => {
        spriteMap.set(sprite.name, sprite);
    })
    const list: SpriteConfig[] = []
    props.zorder.forEach(name => {
        if (spriteMap.has(name)) {
            list.push(spriteMap.get(name) as SpriteConfig);
        }
    })
    return list;
})

// get sprites for stage sort by zorder
const sprites: ComputedRef<StageSprite[]> = computed(() => {
    const spriteMap = new Map<string, StageSprite>();
    props.spriteList.forEach(sprite => {
        const stageSprite: StageSprite = {
            name: sprite.name,
            x: sprite.config.x,
            y: sprite.config.y,
            heading: sprite.config.heading,
            size: sprite.config.size,
            visible: sprite.config.visible,
            costumes: sprite.config.costumes.map((costume, index) => {
                return {
                    name: costume.name as string,
                    url: sprite.files[index].url as string,
                    x: costume.x,
                    y: costume.y,
                };
            }),
            costumeIndex: sprite.config.costumeIndex,
        };
        spriteMap.set(sprite.name, stageSprite);
    });
    const list: StageSprite[] = []
    props.zorder.forEach(name => {
        if (spriteMap.has(name)) {
            list.push(spriteMap.get(name) as StageSprite);
        }
    })
    return list;
})

// ----------methods-----------------------------------------
const emits = defineEmits<{
    (e: 'onSpritesDragEnd', value: { spriteList: SpriteConfig[] }): void
}>()

/**
 * @description: Single sprite drag end
 * @param {*} e
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:47:53
 */
const onSpriteDragEnd = (e: { sprite: SpriteConfig }) => {
    emits('onSpritesDragEnd', {
        spriteList: [e.sprite]
    })
}
</script>
