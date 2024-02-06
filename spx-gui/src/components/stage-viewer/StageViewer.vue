<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-06 16:48:05
 * @FilePath: /spx-gui/src/components/stage-viewer/StageViewer.vue
 * @Description: 
-->
<template>
    <div id="stage-viewer">
        <v-stage :config="{
            width: props.width,
            height: props.height,
            scaleX: scale,
            scaleY: scale,
        }">
            <BackdropLayer :backdrop_config="props.backdrop" :offset_config="{
                offsetX: (props.width / scale - spxMapConfig.width) / 2,
                offsetY: (props.height / scale - spxMapConfig.height) / 2,
            }" :map_config="spxMapConfig" />
            <SpriteLayer @onSpritesDragEnd="onSpritesDragEnd" :offset_config="{
                offsetX: (props.width / scale - spxMapConfig.width) / 2,
                offsetY: (props.height / scale - spxMapConfig.height) / 2
            }" :sprites="props.sprites" :map_config="spxMapConfig" />
        </v-stage>
    </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, withDefaults, watchEffect } from 'vue';
import type { ComputedRef } from 'vue';
import type { StageViewerEmits, StageViewerProps, mapConfig, spriteDragEndEvent } from './index';
import SpriteLayer from './SpriteLayer.vue';
import BackdropLayer from './BackdropLayer.vue';
// ----------props & emit------------------------------------
const props = withDefaults(defineProps<StageViewerProps>(), {
    height: 400, // container height
    width: 400// container width
});
const emits = defineEmits<StageViewerEmits>();

onMounted(() => {
    checkProps();
})


// get the scale of stage viewer
const scale = computed(() => {
    const el = document.getElementById("stage-viewer");
    if (spxMapConfig.value && el) {
        const widthScale = el.clientWidth / spxMapConfig.value.width;
        const heightScale = el.clientHeight / spxMapConfig.value.height;
        console.log(Math.min(widthScale, heightScale, 1))
        return Math.min(widthScale, heightScale, 1);
    }

    return 1;
});

// get spx map size
const spxMapConfig = ref<mapConfig>({
    width: 400,
    height: 400
});
watchEffect(() => {
    if (props.mapConfig) {
        spxMapConfig.value = props.mapConfig
    }
})
watch(() => props.backdrop, (_new, _old) => {
    console.log(_new?.scenes.length, props.backdrop)
    if (_new?.scenes.length && props.backdrop) {
        const _image = new window.Image();
        _image.src = props.backdrop?.scenes[props.backdrop.sceneIndex].url
        _image.onload = () => {
            spxMapConfig.value = {
                width: _image.width,
                height: _image.height
            }
        };
    }
})


const checkProps = () => {
    if (!props.mapConfig && !props.backdrop) {
        console.error("Mapconfig and backdrop must choose one");
    }
}

const onSpritesDragEnd = (e: spriteDragEndEvent) => {
    emits("onSpritesDragEnd", e)
}


</script>
<style scoped>
#stage-viewer {
    height: v-bind("props.height");
    width: v-bind("props.width");
    background-color: rgb(183, 255, 2);
}
</style>