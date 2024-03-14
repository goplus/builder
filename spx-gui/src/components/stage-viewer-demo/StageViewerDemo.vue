<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:18:34
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-28 18:31:44
 * @FilePath: \spx-gui\src\components\stage-viewer-demo\StageViewerDemo.vue
 * @Description:
-->
<template>
  <div style="display: flex">
    <div>
      <input type="file" accept=".zip" @change="importFile" />
      <div>
        <p>active in stage</p>
        <div style="display: flex">
          <div
            v-for="sprite in project.sprite.list"
            :key="sprite.name"
            style="display: flex; flex-direction: column; justify-content: flex-end"
          >
            <template v-if="currentSprite?.name === sprite.name">
              <button
                v-for="(costume, costumeIndex) in sprite.config.costumes"
                :key="costume.name"
                :style="sprite.config.costumeIndex === costumeIndex ? { color: 'red' } : {}"
                @click="() => (sprite.config.costumeIndex = costumeIndex)"
              >
                {{ costume.name }}
              </button>
            </template>
            <button
              :style="currentSprite?.name === sprite.name ? { color: 'red' } : {}"
              @click="
                () => {
                  currentSprite = sprite
                  selectedSpriteNames = [sprite.name]
                }
              "
            >
              {{ sprite.name }}
            </button>
          </div>
        </div>
      </div>
      <div>
        <p>order in stage</p>
        <div>
          <button
            v-for="(spriteName, index) in zorderList"
            :key="spriteName"
            :disabled="index == zorderList.length - 1"
            @click="() => spriteToTop(index)"
          >
            {{ spriteName }}
          </button>
        </div>
      </div>
      <div>
        <h4>backdrop</h4>
        <div v-if="backdropConfig.scenes.length > 0">
          <p>scene</p>
          <!-- in the scene config,the first scene determine the stage size -->
          <button
            v-for="(scene, index) in backdropConfig.scenes"
            :key="scene.name"
            :style="index === 0 ? { color: 'blue' } : {}"
            @click="() => chooseBackdropScene(index)"
          >
            {{ scene.name }}
          </button>
        </div>
        <div v-if="backdropConfig.costumes.length > 0">
          <p>costume</p>
          <button
            v-for="(costume, index) in backdropConfig.costumes"
            :key="costume.name"
            :style="index === backdropConfig.currentCostumeIndex ? { color: 'blue' } : {}"
            @click="() => chooseBackdropCostume(index)"
          >
            {{ costume.name }}
          </button>
        </div>
      </div>
    </div>
    <div style="display: flex; flex-direction: column">
      <p>sprite position</p>
      <n-input-number
        type="number"
        :value="x"
        @update:value="
          (val) => {
            currentSprite && currentSprite.setSx(val as number)
          }
        "
      ></n-input-number>
      <n-input-number
        type="number"
        :value="y"
        @update:value="
          (val) => {
            currentSprite && currentSprite.setSy(val as number)
          }
        "
      ></n-input-number>
      <p>sprite heading</p>
      <n-input-number
        type="number"
        :value="heading"
        @update:value="
          (val) => {
            currentSprite && currentSprite.setHeading(val as number)
          }
        "
      ></n-input-number>
      <p>sprite size</p>
      <n-input-number
        type="number"
        :value="size"
        @update:value="
          (val) => {
            currentSprite && currentSprite.setSize((val as number) / 100)
          }
        "
      ></n-input-number>
      <p>costume position</p>
      <n-input-number
        type="number"
        :value="costumeX"
        @update:value="
          (val) => {
            currentSprite && currentSprite.setCx(val as number)
          }
        "
      ></n-input-number>
      <n-input-number
        type="number"
        :value="costumeY"
        @update:value="
          (val) => {
            currentSprite && currentSprite.setCy(val as number)
          }
        "
      ></n-input-number>
      <n-switch
        v-model:value="visible"
        @update:value="
          (val) => {
            currentSprite && currentSprite.setVisible(val)
          }
        "
      />
    </div>
    <StageViewer
      :selected-sprite-names="selectedSpriteNames"
      :project="project"
      @on-selected-sprites-change="onSelectedSpritesChange"
    />
  </div>
</template>
<script setup lang="ts">
import { NInputNumber, NSwitch } from 'naive-ui'
import type { Sprite } from '@/class/sprite'
import StageViewer from '../stage-viewer'
import type { SelectedSpritesChangeEvent } from '../stage-viewer'
import { useProjectStore } from '@/store/modules/project'
import { storeToRefs } from 'pinia'
import { ref, computed } from 'vue'

const projectStore = useProjectStore()
const { project } = storeToRefs(projectStore)

const currentSprite = ref<Sprite | null>(null)
const selectedSpriteNames = ref<string[]>([])

// current sprite config
const x = computed(() => (currentSprite.value ? currentSprite.value.config.x : 0))
const y = computed(() => (currentSprite.value ? currentSprite.value.config.y : 0))
const heading = computed(() => (currentSprite.value ? currentSprite.value.config.heading : 0))
const size = computed(() => (currentSprite.value ? currentSprite.value.config.size * 100 : 0))
const visible = computed(() => (currentSprite.value ? currentSprite.value.config.visible : false))
// current sprite's current costume config
const costumeX = computed(() =>
  currentSprite.value
    ? currentSprite.value.config.costumes[currentSprite.value.config.costumeIndex].x
    : 0
)
const costumeY = computed(() =>
  currentSprite.value
    ? currentSprite.value.config.costumes[currentSprite.value.config.costumeIndex].y
    : 0
)

// get the config of backdrop
const backdropConfig = computed(() => {
  return {
    scenes: project.value.backdrop.config?.scenes || [],
    costumes: project.value.backdrop.config.costumes || [],
    currentCostumeIndex: project.value.backdrop.config.currentCostumeIndex
  }
})

// get the zorder list of sprite
const zorderList = computed<Array<string>>(() => {
  return project.value.backdrop.config.zorder.filter(
    (item) => typeof item === 'string'
  ) as Array<string>
})

const onSelectedSpritesChange = (e: SelectedSpritesChangeEvent) => {
  selectedSpriteNames.value = e.names
  console.log(e.names)
  currentSprite.value = project.value.sprite.list.find(
    (sprite) => sprite.name === e.names[0]
  ) as Sprite
}

// import file
const importFile = async (e: any) => {
  const file = e.target.files[0]
  projectStore.loadFromZip(file)
}

// set sprite to top
const spriteToTop = (index: number) => {
  const spriteToMove = zorderList.value[index]
  zorderList.value.splice(index, 1)
  zorderList.value.push(spriteToMove)
}

// choose the scene to show in stage
// in spx project the first scene will be shown in stage
const chooseBackdropScene = (index: number) => {
  if (project.value.backdrop.config.scenes) {
    const scenes = [...project.value.backdrop.config.scenes]
    const [sceneItem] = scenes.splice(index, 1)
    scenes.unshift(sceneItem)
    project.value.backdrop.config.scenes = scenes

    const files = project.value.backdrop.files
    if (files) {
      const items = [...files]
      const [fileItem] = items.splice(index, 1)
      items.unshift(fileItem)
      project.value.backdrop.files = items
    }
  }
}

// choose backdrop's current costume
const chooseBackdropCostume = (index: number) => {
  project.value.backdrop.config.currentCostumeIndex = index
}
</script>
