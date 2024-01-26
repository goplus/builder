<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 14:19:57
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-26 17:04:41
 * @FilePath: /spx-gui/src/components/spx-stage/Costume.vue
 * @Description: 
-->
<template>
    <v-image @dragend="handleDragEnd" :config="{
        image: image,
        draggable: true,
        x: SpritePosition.x,
        y: SpritePosition.y,
        rotation: SpriteRotation,
        offsetX: props.costume_config.x,
        offsetY: props.costume_config.y,
        scaleX:props.sprite_config.size,
        scaleY:props.sprite_config.size
    }" />
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineProps, onMounted, ref, computed, watchEffect, onUnmounted } from "vue"
import Calf from "./calf-0.png"



// ----------props & emit------------------------------------
const props = defineProps<{
    sprite_config: {
        x: number,
        y: number,
        heading: number,
        size:number
    },
    costume_config: {
        x: number,
        y: number,
        url: string
    }
}>()
// define the emits
const emits = defineEmits<{
    // when ths costume dragend,emit the sprite position
    (e: 'onDragEnd', spirte: { x: number, y: number; }): void
}>()




// ----------data related -----------------------------------
// TODO use the spx's costume image
const image = ref<HTMLImageElement>()

// ----------computed properties-----------------------------
// Computed spx's sprite position to konva's relative position by about changing sprite postion
const SpritePosition = computed(() => {
    return getRelativePosition(
        props.sprite_config.x,
        props.sprite_config.y
    );
})

// Computed spx's sprite heading to konva's rotation by about changing sprite heading
const SpriteRotation = computed(() => {
    return getRotation(props.sprite_config.heading);
})

// watch the url change to change the image
const stop = watchEffect(() => {
    
    const _image = new window.Image();
    _image.src = props.costume_config.url;
    _image.onload = () => {
        image.value = _image;
        console.log(_image.width, _image.height)
    };
})

// ----------lifecycle hooks---------------------------------

// TODO:use the costume image
onUnmounted(() => stop())

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
        x: 500 / 2 + x,
        y: 300 / 2 - y,
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
        x: x - 500 / 2,
        y: 300 / 2 - y,
    }
}

/**
 * @description: when ths costume dragend,map and emit the sprite position
 * @param {*} event
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 15:44:18
 */
const handleDragEnd = (event) => {
    console.log(getSpxPostion(event.target.attrs.x, event.target.attrs.y))
    emits('onDragEnd', { ...getSpxPostion(event.target.attrs.x, event.target.attrs.y) })
}

</script>