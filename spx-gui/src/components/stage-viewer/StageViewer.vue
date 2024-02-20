<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-20 15:27:08
 * @FilePath: /spx-gui/src/components/stage-viewer/StageViewer.vue
 * @Description: 
-->
<template>
    <div id="stage-viewer">
        <div id="menu" ref="menu" @mouseleave="onStageMenuMouseLeave">
            <div @click="moveSprite('up')">up</div>
            <div @click="moveSprite('down')">down</div>
            <div @click="moveSprite('top')">top</div>
            <div @click="moveSprite('bottom')">bottom</div>
        </div>
        <v-stage ref="stage" @contextmenu="onStageMenu" :config="{
            width: props.width,
            height: props.height,
            scaleX: scale,
            scaleY: scale,
        }">
            <BackdropLayer @onSceneLoadend="onSceneLoadend" :backdropConfig="backdrop" :offsetConfig="{
                offsetX: (props.width / scale - spxMapConfig.width) / 2,
                offsetY: (props.height / scale - spxMapConfig.height) / 2,
            }" :mapConfig="spxMapConfig" />
            <SpriteLayer @onSpritesDragEnd="onSpritesDragEnd" :offsetConfig="{
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
import type { KonvaEventObject, Node } from 'konva/lib/Node';
// import type MouseEvent
// ----------props & emit------------------------------------
const props = withDefaults(defineProps<StageViewerProps>(), {
    height: 400, // container height
    width: 400// container width
});
const emits = defineEmits<StageViewerEmits>();

const currentSprite = ref<Node | null>();
const stage = ref();
const menu = ref();

// get spx map size
const spxMapConfig = ref<MapConfig>({
    width: 400,
    height: 400
});

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



watch(() => props.project, (new_project, old_project) => {
    console.log(new_project, old_project)
    // TODO: temperary use project's title to determine whether to reload
    if (new_project.title !== old_project.title) {
        // witch project have map config,this will confirm the stage size
        // When there is no map, it does not end the loading and waits for the background layer to send new loaded content
        if (new_project.backdrop.config.map) {
            spxMapConfig.value = new_project.backdrop.config.map;
        }
        // If there is no map, but there is a backdrop scene or backdrop costume, it will end the loading and wait for the sprite layer to send new loaded content 
        else if ((!new_project.backdrop.config.scenes || new_project.backdrop.config.scenes.length === 0) && (!new_project.backdrop.config.costumes || new_project.backdrop.config.costumes.length === 0)) {
            console.error("Project missing backdrop configuration or map size configuration");
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

// get backdrop's zorder
const zorderList = computed(() => props.project.backdrop.config.zorder)

// get sprites for stage sort by zorder
const sprites: ComputedRef<StageSprite[]> = computed(() => {
    const spriteMap = new Map<string, StageSprite>();
    props.project.sprite.list.forEach(sprite => {
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
    zorderList.value.forEach(name => {
        if (spriteMap.has(name)) {
            list.push(spriteMap.get(name) as StageSprite);
        }
    })
    return list;
})

// When config is not configured, its stage size is determined by the background image 
const onSceneLoadend = (event: { imageEl: HTMLImageElement }) => {
    if (!props.project.backdrop.config.map) {
        const { imageEl } = event;
        spxMapConfig.value = {
            width: imageEl.width,
            height: imageEl.height
        };
        // loading.value = false;
    }
};

// show stage menu
const onStageMenu = (e: KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();

    const stageInstance = stage.value.getStage();
    console.log(e.target, stageInstance)

    // only the sprite need contextmenu
    if (e.target === stageInstance || e.target.parent!.attrs.name !== 'sprite') {
        menu.value.style.display = 'none';
        currentSprite.value = null
        return;
    }
    currentSprite.value = e.target;
    menu.value.style.display = 'block';
    menu.value.style.top =
        stageInstance.getPointerPosition().y + 4 + 'px';
    menu.value.style.left =
        stageInstance.getPointerPosition().x + 4 + 'px';
}

const onStageMenuMouseLeave = (e: MouseEvent) => {
    menu.value.style.display = 'none';
    currentSprite.value = null
}

// move sprite to up or down & emit  the new zorder list
const moveSprite = (direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (!currentSprite.value) return;

    const spriteName = currentSprite.value.getAttr('spriteName');
    const currentIndex = zorderList.value.indexOf(spriteName);
    let newIndex: number;
    if (direction === 'up') {
        newIndex = currentIndex + 1;
    } else if (direction === 'down') {
        newIndex = currentIndex - 1;
    } else if (direction === 'top') {
        newIndex = zorderList.value.length - 1;
    } else if (direction === 'bottom') {
        newIndex = 0;
    } else {
        return;
    }

    if (currentIndex >= 0 && newIndex >= 0 && newIndex < zorderList.value.length) {
        const newZorderList = [...zorderList.value];
        const [movedSprite] = newZorderList.splice(currentIndex, 1);
        newZorderList.splice(newIndex, 0, movedSprite);
        emits('onZorderChange', { zorder: newZorderList });
    }

    menu.value.style.display = 'none';
};




const onSpritesDragEnd = (e: SpriteDragEndEvent) => {
    emits("onSpritesDragEnd", e)
}


</script>
<style scoped>
#stage-viewer {
    position: relative;
    height: v-bind("props.height + 'px'");
    width: v-bind("props.width + 'px'");
}

#menu {
    z-index: 999;
    display: none;
    position: absolute;
    width: 60px;
    background-color: white;
    box-shadow: 0 0 5px grey;
    border-radius: 3px;
}

#menu>div {
    display: flex;
    justify-content: center;
    cursor: pointer;
    padding: 4px;
}

#menu>div:hover {
    display: flex;
    justify-content: center;
    background-color: #f0f0f0;
}
</style>