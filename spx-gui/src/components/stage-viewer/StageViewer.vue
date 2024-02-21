<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-21 18:57:30
 * @FilePath: /builder/spx-gui/src/components/stage-viewer/StageViewer.vue
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
        <v-stage ref="stage" @mousedown="onStageClick" @contextmenu="onStageMenu" :config="{
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
            }" :spriteList="props.project.sprite.list" :zorder="props.project.backdrop.config.zorder"
                :mapConfig="spxMapConfig" />
            <v-layer>
                <v-transformer ref="transformer" />
            </v-layer>

        </v-stage>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue';
import type { ComputedRef } from 'vue';
import type { StageViewerEmits, StageViewerProps, MapConfig, SpriteDragEndEvent, StageBackdrop, StageSprite } from './index';
import SpriteLayer from './SpriteLayer.vue';
import BackdropLayer from './BackdropLayer.vue';
import type { KonvaEventObject, Node } from 'konva/lib/Node';
import type { SpriteList } from '@/class/asset-list';
import type { Sprite as SpriteConfig } from "@/class/sprite"
// ----------props & emit------------------------------------
const props = withDefaults(defineProps<StageViewerProps>(), {
    height: 400, // container height
    width: 400// container width
});
const emits = defineEmits<StageViewerEmits>();

// instance of konva's stage & menu 
const stage = ref();
const transformer = ref()
const menu = ref();

// Which sprite is selected
const selectedSprite = ref<Node | null>();

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
    if (new_project.id !== old_project.id) {
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
        selectedSprite.value = null
        return;
    }
    selectedSprite.value = e.target;
    menu.value.style.display = 'block';
    menu.value.style.top =
        stageInstance.getPointerPosition().y + 4 + 'px';
    menu.value.style.left =
        stageInstance.getPointerPosition().x + 4 + 'px';
}

// hide stage menu
const onStageMenuMouseLeave = (e: MouseEvent) => {
    menu.value.style.display = 'none';
    selectedSprite.value = null
}

const onStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target.parent!.attrs.name !== 'sprite') {
        console.log('click stage')
        selectedSprites.value = []
    }
    const name = e.target!.attrs.spriteName
    console.log(name)
    const transformerNode = transformer.value.getNode();
    const stage = transformerNode.getStage();

    if (name) {
        // attach to another node
        transformerNode.nodes([ e.target]);
    } else {
        // remove transformer
        transformerNode.nodes([]);
    }
}

// move sprite to up or down & emit  the new zorder list
const moveSprite = (direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (!selectedSprite.value) return;
    const zorderList = props.project.backdrop.config.zorder
    const spriteName = selectedSprite.value.getAttr('spriteName');
    const currentIndex = zorderList.indexOf(spriteName);
    let newIndex: number;
    if (direction === 'up') {
        newIndex = currentIndex + 1;
        selectedSprite.value.moveUp();
    } else if (direction === 'down') {
        newIndex = currentIndex - 1;
        selectedSprite.value.moveDown();
    } else if (direction === 'top') {
        newIndex = zorderList.length - 1;
        selectedSprite.value.moveToTop();
    } else if (direction === 'bottom') {
        newIndex = 0;
        selectedSprite.value.moveToBottom();
    } else {
        return;
    }

    if (currentIndex >= 0 && newIndex >= 0 && newIndex < zorderList.length) {
        const newZorderList = [...zorderList];
        const [movedSprite] = newZorderList.splice(currentIndex, 1);
        newZorderList.splice(newIndex, 0, movedSprite);
        props.project.backdrop.config.zorder = newZorderList;
        // emits('onZorderChange', { zorder: newZorderList });
    }

    menu.value.style.display = 'none';
};


const selectedSprites = ref<string[]>([]);
watch(() => props.selectedSpriteNames, (newValue, oldValue) => {
    selectedSprites.value = newValue
})

// drag sprite
const onSpritesDragEnd = (e: { spriteList: SpriteConfig[] }) => {
    emits("onSelectedSpriteChange", { names: e.spriteList.map(s => s.name) })
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