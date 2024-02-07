# StageViewer Module

## Module Purpose

The StageViewer module is designed to show the sprite and stage status of  different spx project and dragging the sprite.

Through the StageViewer module, users can configure the project's sprite, backdrop, stage size, and so on, without caring about the actual rendering logic.

## Module Scope
This module passes in the id of the project, the width and height of the container, the actual stage size, the sprite list, the backdrop, and the list of sprite names that currently need to be displayed on the stage. 
When the user drags the sprite, which sends the sprite drag completion event, allowing the user to get the sprite where the drag occurred and the new location in spx.

### Inputs

| Parameter | Required | Type    | Description                                                  |
| --------- | -------- | ------- | ------------------------------------------------------------ |
| `id`     | Yes      | `string`  | Id of the project |
| `height`      | No      | `string` | Container height of stage viewer    |
| `width`      | No      | `string` | Container width of stage viewer   |
| `mapConfig` | No | `MapConfig` | Actual stage size. If there is no mapConfig, the stage size is calculated according to the backdrop image. |
| `sprites` | Yes | `StageSprite[]` | sprites in project |
| `currentSpriteNames` | Yes | `string[]` | The sprites that need to be displayed on the stage |
| `backdrop` | No | `StageBackdrop` | backdrop in project |

### Outputs

| Event Name | Event Data Type | Description |
| --------- | -------- | ------- | 
| `onSpritesDragEnd` | `SpriteDragEndEvent` | The sprites dragend event|

## Base Usage
In the following example, we pass the backdrop / sprite list and other information obtained from the project store into the stage viewer, and you can see that the sprite and backdrop in the project and the corresponding stage size are rendered in stage viewer. After the sprite has been dragged, you can get the wizard and its information from the onSpritesDragEnd event.
```vue
<template>
    <input type="file" @change="add" accept=".zip">
    <StageViewer :id="projectId" :backdrop="backdrop" :sprites="sprites" :currentSpriteNames="currentSpriteNames" @onSpritesDragEnd="onDragEnd"/>
</template>
<script setup lang="ts">
import StageViewer from "../stage-viewer";
import type { StageSprite, StageBackdrop } from "../stage-viewer"
import { useProjectStore } from "@/store/modules/project";
import { storeToRefs } from "pinia";
import { ref, computed, watch } from "vue";
import type { ComputedRef } from "vue";
const projectStore = useProjectStore();
const { project } = storeToRefs(projectStore);
const add = async (e: any) => {
    await projectStore.loadProject(e.target.files[0], e.target.files[0].name.split(".")[0]);
}
const onDragEnd = (event: SpriteDragEndEvent) => {
    console.log(event)
}
const projectId = computed(() => project.value.title)
const currentSpriteNames = ref<String[]>([])
const sprites: ComputedRef<StageSprite[]> = computed(() => {
    const list = project.value.sprite.list.map(sprite => {
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
watch(() => project.value.title, () => {
    currentSpriteNames.value = sprites.value.map(sprite => sprite.name)
})
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
```