<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:33:08
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-25 17:50:19
 * @FilePath: /builder/spx-gui/src/components/spx-stage/StageViewer.vue
 * @Description: 
-->
<template>
    <!-- <div style="position:absolute;right: 0; display: flex;justify-content: end;align-items: center;flex-direction: column;">
        <div>spriteX:<n-input-number v-model:value="sprite.x"></n-input-number></div>
        <div>spriteY:<n-input-number v-model:value="sprite.y"></n-input-number></div>
        <div>heading: <n-input-number :min="-180" :max="180" placeholder="请输入角度"
                v-model:value="sprite.heading"></n-input-number></div>
        <div>costumeIndex: <n-input-number :min="0" :max="sprite.costumes.length - 1"
                v-model:value="sprite.costumeIndex"></n-input-number></div>
        <div>costumeX:<n-input-number v-model:value="currentCostume.x"></n-input-number></div>
        <div>costumeY:<n-input-number v-model:value="currentCostume.y"></n-input-number></div>
    </div> -->
    <div id="stage-viewer">
        <div class="stage-viewer-wrapper" :style="{ width: stageConfig.width, height: stageConfig.height }">
            <v-stage :config="stageConfig">
                <BackdropLayer />
                <SpriteLayer />
            </v-stage>
        </div>
    </div>
</template>
<script setup lang="ts">
// ----------Import required packages / components-----------
import { computed } from "vue"
import { useStageStore } from "@/store"
import SpriteLayer from "./SpriteLayer.vue"
import BackdropLayer from "./BackdropLayer.vue"

// ----------props & emit------------------------------------
const stageStore = useStageStore()

// ----------computed properties-----------------------------

const stageConfig = computed(() => {
    return {
        ...stageStore.stageConfig
    }
})


</script>
<style>
#stage-viewer {
    height: 300px;
    display: flex;
    justify-content: center;
}

.stage-viewer-wrapper {
    border: 1px solid black;
}
</style>