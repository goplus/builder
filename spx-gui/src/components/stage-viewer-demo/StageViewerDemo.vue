<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:18:34
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 16:40:21
 * @FilePath: /spx-gui/src/components/stage-viewer-demo/StageViewerDemo.vue
 * @Description:
-->
<template>
    <input type="file" @change="add" accept=".zip">


    <div style="display: flex;">
        <div style="display: flex;flex-direction: column;">
            <div>
                <p>show in stage viewer</p>
                <template v-for="sprite in sprites" :key="sprite.name">
                    <button :style="currentSpriteNames.includes(sprite.name) ? { color: 'blue' } : {}"
                        @click="toggleShowInStage(sprite.name)">
                        {{ sprite.name }}
                    </button>
                </template>
            </div>
            <div>
                <p>active in stage</p>
                <button v-for="sprite in project.sprite.list" :key="sprite.name" @click="currentSprite = sprite"
                    :style="currentSprite?.name === sprite.name ? { color: 'yellow' } : {}">
                    {{ sprite.name }}
                </button>
            </div>
            <p>sprite position</p>
            <n-input-number type="number" :value="x"
                @update:value="(val) => { currentSprite && currentSprite.setSx(val as number) }"></n-input-number>
            <n-input-number type="number" :value="y"
                @update:value="(val) => { currentSprite && currentSprite.setSy(val as number) }"></n-input-number>
            <p>sprite heading</p>
            <n-input-number type="number" :value="heading"
                @update:value="(val) => { currentSprite && currentSprite.setHeading(val as number) }"></n-input-number>
            <p>sprite size</p>
            <n-input-number type="number" :value="size"
                @update:value="(val) => { currentSprite && currentSprite.setSize(val as number / 100) }"></n-input-number>
            <p>costume position</p>
            <n-input-number type="number" :value="costumeX"
                @update:value="(val) => { currentSprite && currentSprite.setCx(val as number) }"></n-input-number>
            <n-input-number type="number" :value="costumeY"
                @update:value="(val) => { currentSprite && currentSprite.setCy(val as number) }"></n-input-number>
            <n-switch v-model:value="visible" @update:value="(val) => { currentSprite && currentSprite.setVisible(val) }" />
        </div>
        <div style="width:400px;height:400px;">
            <StageViewer :id="projectId" @onSpritesDragEnd="onDragEnd" :backdrop="backdrop" :sprites="sprites"
                :currentSpriteNames="currentSpriteNames" />
        </div>
    </div>
</template>
<script setup lang="ts">
import { NInputNumber, NSwitch } from "naive-ui";
import type { Sprite } from "@/class/sprite";

import StageViewer from "../stage-viewer";
import type { StageSprite, SpriteDragEndEvent, StageBackdrop } from "../stage-viewer"
import { useProjectStore } from "@/store/modules/project";
import { storeToRefs } from "pinia";
import { ref, computed, watch } from "vue";
import type { ComputedRef } from "vue";
const projectStore = useProjectStore();
const { project } = storeToRefs(projectStore);
const add = async (e: any) => {
    await projectStore.loadProject(e.target.files[0], e.target.files[0].name.split(".")[0]);
}


const x = computed(() => currentSprite.value ? currentSprite.value.config.x : 0)
const y = computed(() => currentSprite.value ? currentSprite.value.config.y : 0)
const heading = computed(() => currentSprite.value ? currentSprite.value.config.heading : 0)
const size = computed(() => currentSprite.value ? currentSprite.value.config.size * 100 : 0)
const visible = computed(() => currentSprite.value ? currentSprite.value.config.visible : false)
const costumeX = computed(() => currentSprite.value ? currentSprite.value.config.costumes[currentSprite.value.config.costumeIndex].x : 0)
const costumeY = computed(() => currentSprite.value ? currentSprite.value.config.costumes[currentSprite.value.config.costumeIndex].y : 0)


// TODO: Temporarily use title of project as id
const projectId = computed(() => project.value.title)

const currentSprite = ref<Sprite | null>(null);

const currentSpriteNames = ref<string[]>([])


const sprites: ComputedRef<StageSprite[]> = computed(() => {
    const list = project.value.sprite.list.map(sprite => {
        console.log(sprite)
        return {
            name: sprite.name,
            x: sprite.config.x,
            y: sprite.config.y,
            heading: sprite.config.heading,
            size: sprite.config.size,
            visible: sprite.config.visible, // Visible at run time
            zorder: 1,
            costumes: sprite.config.costumes.map((costume, index) => {
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
    return list as StageSprite[];
})

const toggleShowInStage = (name: string) => {
    currentSpriteNames.value =
        currentSpriteNames.value.includes(name) ?
            currentSpriteNames.value.filter(_name => _name !== name)
            : [...currentSpriteNames.value, name]
}

// TODO: Temporarily use title of project as id
watch(() => project.value.title, () => {
    currentSpriteNames.value = sprites.value.map(sprite => sprite.name)
})


const onDragEnd = (e: SpriteDragEndEvent) => {
    currentSprite.value = project.value.sprite.list.find(sprite => sprite.name === e.targets[0].sprite.name) as Sprite
    currentSprite.value?.setSx(e.targets[0].position.x)
    currentSprite.value?.setSy(e.targets[0].position.y)
}

const backdrop: ComputedRef<StageBackdrop> = computed(() => {

    return {
        scenes: project.value.backdrop.config.scenes.map((scene, index) => ({
            name: scene.name as string,
            url: project.value.backdrop.files[index].url as string
        })),
        sceneIndex: project.value.backdrop.currentSceneIndex
    }
})




</script>