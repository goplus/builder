<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 14:19:57
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 09:19:07
 * @FilePath: /spx-gui/src/components/stage-viewer/Costume.vue
 * @Description: 
-->
<template>
    <v-image @dragend="handleDragEnd" :config="{
        image: image,
        draggable: true,
        x: spritePosition.x,
        y: spritePosition.y,
        rotation: spriteRotation,
        offsetX: props.costumeConfig.x,
        offsetY: props.costumeConfig.y,
        scaleX: props.spriteConfig.size,
        scaleY: props.spriteConfig.size
    }" />
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineProps, onMounted, ref, computed, watchEffect, onUnmounted, watch } from "vue"
import type { StageCostume, StageSprite, MapConfig, SpriteDragEndTarget } from "./index";


// ----------props & emit------------------------------------
const props = defineProps<{
    spriteConfig: StageSprite,
    costumeConfig: StageCostume,
    mapConfig: MapConfig
}>()
// define the emits
const emits = defineEmits<{
    // when ths costume dragend,emit the sprite position
    (e: 'onDragEnd', event: SpriteDragEndTarget): void
}>()




// ----------data related -----------------------------------
const image = ref<HTMLImageElement>()

// ----------computed properties-----------------------------
// Computed spx's sprite position to konva's relative position by about changing sprite postion
const spritePosition = computed(() => {
    return getRelativePosition(
        props.spriteConfig.x,
        props.spriteConfig.y
    );
})

// Computed spx's sprite heading to konva's rotation by about changing sprite heading
const spriteRotation = computed(() => {
    return getRotation(props.spriteConfig.heading);
})

watch(() => props.costumeConfig.url, (new_url, old_url) => {
    if (new_url) {
        const _image = new window.Image();
        _image.src = props.costumeConfig.url;
        _image.onload = () => {
            image.value = _image;
            console.log(_image.width, _image.height)
        };
    } else {
        image.value?.remove();
    }
}, {
    immediate: true
})


// ----------methods-----------------------------------------
/**
 * @description: map spx's sprite position to konva's relative position
 * @param {*} x
 * @param {*} y
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 14:52:50
 */
const getRelativePosition = (x: number, y: number): { x: number; y: number; } => {
    // 返回计算后的位置  stage.width / 2 + x ，stage.height / 2 + y
    return {
        x: props.mapConfig.width / 2 + x,
        y: props.mapConfig.height / 2 - y,
    };
};

/**
 * @description: map spx's sprite heading to konva's rotation
 * @param {*} heading
 * @return {*}
 */
const getRotation = (heading: number): number => {
    return heading - 90
};


/**
 * @description: map konva's relative postion to spx's position
 * @param {*} x
 * @param {*} y
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:28:36
 */
const getSpxPostion = (x: number, y: number): { x: number; y: number; } => {
    return {
        x: x - props.mapConfig.width / 2,
        y: props.mapConfig.height / 2 - y,
    }
}

/**
 * @description: when ths costume dragend,map and emit the sprite position
 * @param {*} event
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:44:18
 */
const handleDragEnd = (event: { target: { attrs: { x: number, y: number } } }) => {
    emits('onDragEnd', {
        sprite: props.spriteConfig,
        costume: props.costumeConfig,
        position: getSpxPostion(event.target.attrs.x, event.target.attrs.y)
    })
}

</script>