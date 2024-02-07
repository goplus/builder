<!--
 * @Author: Zhang zhiyang
 * @Date: 2024-01-15 14:56:59
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-07 18:02:21
 * @FilePath: /spx-gui/src/components/spx-stage/SpxStage.vue
 * @Description: 
-->
<template>
  <div class="spx-stage">
    <div class="stage-button">{{ $t('component.stage') }}</div>
    <n-button type="success" class="stage-run-button" @click="run">{{ $t('stage.run') }}</n-button>
    <iframe src="/main.html" frameborder="0" v-if="show" class="show"></iframe>
    <div class="stage-viewer-container" v-else>
      <StageViewer @onSpritesDragEnd="onSpritesDragEnd" :id="projectStore.project.title"
        :currentSpriteNames="currentSpriteNames" :backdrop="backdrop" :sprites="sprites"></StageViewer>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, ref, computed, watch } from "vue";
import type { ComputedRef } from "vue"
import { NButton } from "naive-ui";
import { useProjectStore } from "@/store/modules/project";
import { useSpriteStore } from "@/store";
import { useBackdropStore } from "@/store/modules/backdrop";
import StageViewer from "@/components/stage-viewer";
import type { StageSprite, StageBackdrop, SpriteDragEndEvent } from "@/components/stage-viewer"
import { Sprite } from "@/class/sprite";

let show = ref(false);
const backdropStore = useBackdropStore();

const projectStore = useProjectStore();
const spriteStore = useSpriteStore();

const currentSpriteNames = ref<string[]>([])

const onSpritesDragEnd = (e: SpriteDragEndEvent) => {
  spriteStore.setCurrentByName(e.targets[0].sprite.name)
  spriteStore.current?.setSx(e.targets[0].position.x)
  spriteStore.current?.setSy(e.targets[0].position.y)
}


// TODO: Temporarily use title of project as id
watch(() => projectStore.project.title, () => {
  currentSpriteNames.value = sprites.value.map(sprite => sprite.name)
})
const sprites: ComputedRef<StageSprite[]> = computed(() => {
  const list = spriteStore.list.map(sprite => {
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
const backdrop: ComputedRef<StageBackdrop> = computed(() => {
  return {
    scenes: backdropStore.backdrop.config.scenes.map((scene, index) => ({
      name: scene.name as string,
      url: backdropStore.backdrop.files[index].url as string
    })),
    sceneIndex: backdropStore.backdrop.currentSceneIndex
  }
})


const run = async () => {
  console.log('run')
  show.value = false;
  // TODO: backdrop.config.zorder depend on sprites, entry code depend on sprites and other code (such as global variables).
  backdropStore.backdrop.config = backdropStore.backdrop.defaultConfig;
  window.project_path = projectStore.project.title;
  show.value = true;
};

</script>

<style scoped lang="scss">
.spx-stage {
  height: 40vh;
  display: flex;
  flex-direction: column;
  border: 2px solid #00142970;
  position: relative;
  background: white;
  border-radius: 24px;
  margin: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .stage-button {
    background: rgba(90, 196, 236, 0.4);
    width: 80px;
    height: auto;
    text-align: center;
    position: absolute;
    top: -2px;
    left: 8px;
    font-size: 18px;
    border: 2px solid #00142970;
    border-radius: 0 0 10px 10px;
    z-index: 2;
  }

  .n-button {
    background: #3a8b3b;
    width: 50px;
    position: absolute;
    right: 6px;
    top: 2px;
    border: 2px solid #00142970;
    border-radius: 16px;
    z-index: 100;
  }

  .show {
    flex: 1;
    text-align: center;
  }

  .center {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stage-viewer-container{
    display: flex;
    justify-content: center;
  }
}
</style>
