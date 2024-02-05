<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:18:34
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-05 17:31:51
 * @FilePath: /spx-gui/src/components/stage-viewer-demo/StageViewerDemo.vue
 * @Description:
-->
<template>
    <input type="file" @change="add" accept=".zip">
    <div style="width:400px;height:400px;">
        <StageViewer :map-config="{ width: 404, height: 720 }" :sprites="sprites" />
    </div>
</template>
<script setup lang="ts">
import StageViewer, { type StageSprite } from "../stage-viewer";
import { useProjectStore } from "@/store/modules/project";
import { storeToRefs } from "pinia";
import { ref, computed } from "vue";
import type { ComputedRef } from "vue";
const projectStore = useProjectStore();
const { project } = storeToRefs(projectStore);
const add = async (e: any) => {
    await projectStore.loadProject(e.target.files[0], e.target.files[0].name.split(".")[0]);
}
const sprites: ComputedRef<StageSprite[]> = computed(() => {
    const list = project.value.sprite.list.map(sprite => {
        return {
            id: sprite.name,
            name: sprite.name,
            x: sprite.config.x,
            y: sprite.config.y,
            heading: sprite.config.heading,
            size: sprite.config.size,
            visible: sprite.config.visible, // Visible at run time
            stageVisible: true, // Visible at preview time
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

</script>