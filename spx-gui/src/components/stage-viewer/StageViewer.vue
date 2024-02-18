<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-18 17:37:59
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
            <BackdropLayer @onSceneLoadend="onSceneLoadend" :loading="loading" :backdropConfig="backdrop" :offsetConfig="{
                offsetX: (props.width / scale - spxMapConfig.width) / 2,
                offsetY: (props.height / scale - spxMapConfig.height) / 2,
            }" :mapConfig="spxMapConfig" />
            <SpriteLayer :loading="loading" @onSpritesDragEnd="onSpritesDragEnd" :offsetConfig="{
                offsetX: (props.width / scale - spxMapConfig.width) / 2,
                offsetY: (props.height / scale - spxMapConfig.height) / 2
            }" :sprites="sprites" :mapConfig="spxMapConfig" :currentSpriteNames="props.currentSpriteNames" />
        </v-stage>
    </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, withDefaults, watchEffect } from 'vue';
import type { ComputedRef } from 'vue';
import type { StageViewerEmits, StageViewerProps, MapConfig, SpriteDragEndEvent, StageBackdrop, StageSprite } from './index';
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



watch(() => props.project, (new_project, old_project) => {
    console.log(new_project, old_project)
    // TODO: temperary use project's title to determine whether to reload
    if (new_project.title !== old_project.title) {
        loading.value = true;
        // witch project have map config,this will confirm the stage size
        // When there is no map, it does not end the loading and waits for the background layer to send new loaded content
        if (new_project.backdrop.config.map) {
            spxMapConfig.value = new_project.backdrop.config.map;
            loading.value = false
        }
        // If there is no map, but there is a backdrop scene or backdrop costume, it will end the loading and wait for the sprite layer to send new loaded content 
        else if ((!new_project.backdrop.config.scenes || new_project.backdrop.config.scenes.length === 0) && (!new_project.backdrop.config.costumes || new_project.backdrop.config.costumes.length === 0)) {
            console.error("Project missing backdrop configuration or map size configuration");
            loading.value = false
        }
    }
}, {
    deep: true
})

const backdrop = computed(() => {
    const { files, config } = props.project.backdrop;
    console.log(files, config)
    return props.project.backdrop.config.map ? null : {
        scenes: config.scenes?.map((scene, index) => ({
            name: scene.name as string,
            url: files[index].url as string
        })) || [],
        costumes: config.costumes?.map((costume, index) => ({
            name: costume.name as string,
            url: files[index].url as string,
            x: costume.x || 0,
            y: costume.y || 0
        })) || [],
        currentCostumeIndex: config.currentCostumeIndex || 0
    } as StageBackdrop
})

const sprites: ComputedRef<StageSprite[]> = computed(() => {
    const list = props.project.sprite.list.map(sprite => {

        return {
            name: sprite.name,
            x: sprite.config.x,
            y: sprite.config.y,
            heading: sprite.config.heading,
            size: sprite.config.size,
            visible: sprite.config.visible, // Visible at run time
            zorder: 1,
            costumes: sprite.config.costumes.map((costume, index) => {
                console.log(costume)
                return {
                    name: costume.name as string,
                    url: sprite.files[index].url as string,
                    x: costume.x,
                    y: costume.y,
                }
            }),
            costumeIndex: sprite.config.costumeIndex,
        }
    })
    console.log(list)
    return list as StageSprite[];
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

const onSpritesDragEnd = (e: SpriteDragEndEvent) => {
    emits("onSpritesDragEnd", e)
}


</script>
<style scoped>
#stage-viewer {
    height: v-bind("props.height + 'px'");
    width: v-bind("props.width + 'px'");
}
</style>