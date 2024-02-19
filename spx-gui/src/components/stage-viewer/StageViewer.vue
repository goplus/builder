<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 17:15:13
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
            <BackdropLayer @onSceneLoadend="onSceneLoadend" :loading="loading" :backdropConfig="props.backdrop"
                :offsetConfig="{
                    offsetX: (props.width / scale - spxMapConfig.width) / 2,
                    offsetY: (props.height / scale - spxMapConfig.height) / 2,
                }" :mapConfig="spxMapConfig" />
            <SpriteLayer :loading="loading" @onSpritesDragEnd="onSpritesDragEnd" :offsetConfig="{
                offsetX: (props.width / scale - spxMapConfig.width) / 2,
                offsetY: (props.height / scale - spxMapConfig.height) / 2
            }" :sprites="props.sprites" :mapConfig="spxMapConfig" :currentSpriteNames="props.currentSpriteNames" />
        </v-stage>
    </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, withDefaults, watchEffect } from 'vue';
import type { ComputedRef } from 'vue';
import type { StageViewerEmits, StageViewerProps, MapConfig, SpriteDragEndEvent } from './index';
import SpriteLayer from './SpriteLayer.vue';
import BackdropLayer from './BackdropLayer.vue';
// ----------props & emit------------------------------------
const props = withDefaults(defineProps<StageViewerProps>(), {
    height: 400, // container height
    width: 400// container width
});
const emits = defineEmits<StageViewerEmits>();
const loading = ref(true);

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
const spxMapConfig = ref<MapConfig>({
    width: 400,
    height: 400
});

watch(() => props.id, () => {
    loading.value = true;
    checkProps();
})

watchEffect(() => {
    // when the stage size is determined by mapConfig,There is no need for the background layer to complete loading
    if (props.mapConfig) {
        console.log(props.mapConfig)
        spxMapConfig.value = props.mapConfig
        loading.value = false
    }
})


// When config is not configured, its stage size is determined by the first loaded background image
const onSceneLoadend = (event: { imageEl: HTMLImageElement }) => {
    if (loading.value) {
        const { imageEl } = event;
        spxMapConfig.value = {
            width: imageEl.width,
            height: imageEl.height
        };
        loading.value = false;
    }
};

const checkProps = () => {
    if (!props.mapConfig && !props.backdrop) {
        console.error("Mapconfig and backdrop must choose one");
    }
}

const onSpritesDragEnd = (e: SpriteDragEndEvent) => {
    emits("onSpritesDragEnd", e)
}


</script>
<style scoped>
#stage-viewer {
    height: v-bind("props.height + 'px'");
    width: v-bind("props.width+ 'px'");
}
</style>