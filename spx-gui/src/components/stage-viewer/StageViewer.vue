<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-05 17:49:21
 * @FilePath: /spx-gui/src/components/stage-viewer/StageViewer.vue
 * @Description: 
-->
<template>
    <div id="stage-viewer">
        <v-stage :config="{
            width: prop.width,
            height: prop.height,
            scaleX: scale,
            scaleY: scale
        }">
            <v-layer>
                <v-rect :config="{
                    width: spxMapConfig.width,
                    height: spxMapConfig.height,
                    fill: '#eb65a9'
                }"></v-rect>
            </v-layer>
            <SpriteLayer :sprites="prop.sprites" :map_config="spxMapConfig"></SpriteLayer>
        </v-stage>
    </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, withDefaults } from 'vue';
import type { ComputedRef } from 'vue';
import type { StageViewerEmits, StageViewerProps, mapConfig } from './index';
import SpriteLayer from './SpriteLayer.vue';
// ----------props & emit------------------------------------
const prop = withDefaults(defineProps<StageViewerProps>(), {
    height: 400, // container height
    width: 400// container width
});
const emit = defineEmits<StageViewerEmits>();

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
const spxMapConfig: ComputedRef<mapConfig> = computed(() => {
    if (prop.mapConfig) {
        return prop.mapConfig
    } else {
        // TODO: get spx map size from backdrop
        return {
            width: 300,
            height: 300
        }
    }
})

const checkProps = () => {
    if (!prop.mapConfig && !prop.backdrop) {
        console.error("Mapconfig and backdrop must choose one");
    }
}


</script>
<style scoped>
#stage-viewer {
    height: v-bind("prop.height");
    width: v-bind("prop.width");
    background-color: rgb(183, 255, 2);
}
</style>