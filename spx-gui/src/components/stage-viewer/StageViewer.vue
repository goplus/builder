<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-22 23:14:28
 * @FilePath: \spx-gui\src\components\stage-viewer\StageViewer.vue
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
    <v-stage
      ref="stage"
      @mousedown="onStageClick"
      @contextmenu="onStageMenu"
      :config="{
        width: props.width,
        height: props.height,
        scaleX: scale,
        scaleY: scale
      }"
    >
      <BackdropLayer
        @onSceneLoadend="onSceneLoadend"
        :backdropConfig="backdrop"
        :offsetConfig="{
          offsetX: (props.width / scale - spxMapConfig.width) / 2,
          offsetY: (props.height / scale - spxMapConfig.height) / 2
        }"
        :mapConfig="spxMapConfig"
      />
      <SpriteLayer
        :offsetConfig="{
          offsetX: (props.width / scale - spxMapConfig.width) / 2,
          offsetY: (props.height / scale - spxMapConfig.height) / 2
        }"
        :spriteList="props.project.sprite.list"
        :zorder="props.project.backdrop.config.zorder"
        :selectedSpriteNames="stageSelectSpritesName"
        :mapConfig="spxMapConfig"
      />
      <v-layer
        :config="{
          name: 'controller',
          x: (props.width / scale - spxMapConfig.width) / 2,
          y: (props.height / scale - spxMapConfig.height) / 2
        }"
      >
        <v-transformer
          ref="transformer"
          :enabledAnchors="[]"
          :rotateEnabled="false"
          :config="{
            borderDash: [6, 6]
          }"
          :draggable="true"
        />
        <template v-for="spritename in selectedSpriteNames" :key="spritename">
          <v-rect
            :config="{
              controller: true,
              spriteName: spritename,
              fill: 'rgba(0,0,0,0)',
              draggable: true
            }"
          >
          </v-rect>
        </template>
      </v-layer>
    </v-stage>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue'
import type { ComputedRef } from 'vue'
import type {
  StageViewerEmits,
  StageViewerProps,
  MapConfig,
  SpriteDragEndEvent,
  StageBackdrop,
  StageSprite
} from './index'
import SpriteLayer from './SpriteLayer.vue'
import BackdropLayer from './BackdropLayer.vue'
import type { KonvaEventObject, Node } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import type { SpriteList } from '@/class/asset-list'
import type { Sprite as SpriteConfig } from '@/class/sprite'
import { Rect } from 'konva/lib/shapes/Rect.js'
import type { Layer } from 'konva/lib/Layer'

// ----------props & emit------------------------------------
const props = withDefaults(defineProps<StageViewerProps>(), {
  height: 400, // container height
  width: 400 // container width
})
const emits = defineEmits<StageViewerEmits>()

// instance of konva's stage & menu
const stage = ref<Stage>()
const transformer = ref()
const menu = ref()

// get spx map size
const spxMapConfig = ref<MapConfig>({
  width: 400,
  height: 400
})

// get the scale of stage viewer
const scale = computed(() => {
  const el = document.getElementById('stage-viewer')
  if (spxMapConfig.value && el) {
    const widthScale = el.clientWidth / spxMapConfig.value.width
    const heightScale = el.clientHeight / spxMapConfig.value.height
    console.log(Math.min(widthScale, heightScale, 1))
    return Math.min(widthScale, heightScale, 1)
  }
  return 1
})

watch(
  () => props.project,
  (new_project, old_project) => {
    console.log(new_project, old_project)
    if (new_project.id !== old_project.id) {
      // witch project have map config,this will confirm the stage size
      // When there is no map, it does not end the loading and waits for the background layer to send new loaded content
      if (new_project.backdrop.config.map) {
        spxMapConfig.value = new_project.backdrop.config.map
      }
      // If there is no map, but there is a backdrop scene or backdrop costume, it will end the loading and wait for the sprite layer to send new loaded content
      else if (
        (!new_project.backdrop.config.scenes || new_project.backdrop.config.scenes.length === 0) &&
        (!new_project.backdrop.config.costumes || new_project.backdrop.config.costumes.length === 0)
      ) {
        console.error('Project missing backdrop configuration or map size configuration')
      }
    }
  },
  {
    deep: true
  }
)

//  which are selected
const stageSelectSpritesName = ref<string[]>([])
watch(
  () => props.selectedSpriteNames,
  (spriteNames) => {
    if (spriteNames.every((name, index) => name === stageSelectSpritesName.value[index])) {
      return
    }
    stageSelectSpritesName.value = spriteNames
  }
)

// selected sprite change tigger transformer show or hide
watch(
  () => stageSelectSpritesName.value,
  (spritesName) => {
    console.log(spritesName, props.selectedSpriteNames, stageSelectSpritesName.value)
    if (
      props.selectedSpriteNames.length !== stageSelectSpritesName.value.length ||
      !props.selectedSpriteNames.every(
        (name, index) => name === stageSelectSpritesName.value[index]
      )
    ) {
      emits('onSelectedSpriteChange', { names: stageSelectSpritesName.value })
    }
    showSelectedTranformer()
  }
)

const backdrop = computed(() => {
  const { files, config } = props.project.backdrop
  console.log(files, config)
  return props.project.backdrop.config.map
    ? null
    : ({
        scenes:
          config.scenes?.map((scene, index) => ({
            name: scene.name as string,
            url: files[index].url as string
          })) || [],
        costumes:
          config.costumes?.map((costume, index) => ({
            name: costume.name as string,
            url: files[index].url as string,
            x: costume.x || 0,
            y: costume.y || 0
          })) || [],
        currentCostumeIndex: config.currentCostumeIndex || 0
      } as StageBackdrop)
})

// When config is not configured, its stage size is determined by the background image
const onSceneLoadend = (event: { imageEl: HTMLImageElement }) => {
  if (!props.project.backdrop.config.map) {
    const { imageEl } = event
    spxMapConfig.value = {
      width: imageEl.width,
      height: imageEl.height
    }
    // loading.value = false;
  }
}

// show stage menu
const onStageMenu = (e: KonvaEventObject<MouseEvent>) => {
  e.evt.preventDefault()
  if (!stage.value) return
  // only the sprite need contextmenu
  if (e.target.parent!.attrs.name !== 'sprite' && e.target.parent!.attrs.name !== 'controller') {
    menu.value.style.display = 'none'
    stageSelectSpritesName.value = []
    return
  }
  if (e.target.getAttr('spriteName')) {
    stageSelectSpritesName.value = [e.target.getAttr('spriteName')]
    menu.value.style.display = 'block'
    menu.value.style.top = stage.value.getStage().getPointerPosition()!.y + 4 + 'px'
    menu.value.style.left = stage.value.getStage().getPointerPosition()!.x + 4 + 'px'
  }
}

// hide stage menu
const onStageMenuMouseLeave = (e: MouseEvent) => {
  menu.value.style.display = 'none'
  stageSelectSpritesName.value = []
}

const onStageClick = (e: KonvaEventObject<MouseEvent>) => {
  // clear choose sprite
  console.log(e.target.parent!.attrs.name)
  if (e.target.parent!.attrs.name !== 'sprite' || e.target.parent!.attrs.name !== 'controller') {
    stageSelectSpritesName.value = []
  }
  const name = e.target!.attrs.spriteName
  if (name) {
    stageSelectSpritesName.value = [name]
  }
}

// move sprite to up or down & emit  the new zorder list
const moveSprite = (direction: 'up' | 'down' | 'top' | 'bottom') => {
  if (!stageSelectSpritesName.value.length) return

  // move single sprite
  const zorderList = props.project.backdrop.config.zorder
  console.log(stageSelectSpritesName.value)
  const spriteName = stageSelectSpritesName.value[0]
  const currentIndex = zorderList.indexOf(spriteName)
  const node = stage.value!.getStage().findOne((node: Node) => {
    console.log(node.getAttr('spriteName'), spriteName)

    return node.getAttr('spriteName') === spriteName
  }) as Node
  console.log(node)
  let newIndex: number
  if (direction === 'up') {
    newIndex = currentIndex + 1
    node.moveUp()
  } else if (direction === 'down') {
    newIndex = currentIndex - 1
    node.moveDown()
  } else if (direction === 'top') {
    newIndex = zorderList.length - 1
    node.moveToTop()
  } else if (direction === 'bottom') {
    newIndex = 0
    node.moveToBottom()
  } else {
    return
  }

  if (currentIndex >= 0 && newIndex >= 0 && newIndex < zorderList.length) {
    const newZorderList = [...zorderList]
    const [movedSprite] = newZorderList.splice(currentIndex, 1)
    newZorderList.splice(newIndex, 0, movedSprite)
    props.project.backdrop.config.zorder = newZorderList
    // emits('onZorderChange', { zorder: newZorderList });
  }

  menu.value.style.display = 'none'
}

const showSelectedTranformer = () => {
  setTimeout(() => {
    if (!stage.value) return
    console.log(stageSelectSpritesName.value)
    const spriteNames = stageSelectSpritesName.value
    const nodes = stage.value.getStage().find((node: Node) => {
      if (node.getAttr('spriteName') && spriteNames.includes(node.getAttr('spriteName'))) {
        return true
      } else {
        return false
      }
    })

    // choosed nodes
    const transformerNode = transformer.value.getNode()
    const layer = stage.value.getStage().findOne('.sprite') as Layer
    console.log(layer)

    if (nodes.length) {
      transformerNode.nodes([...nodes])
    } else {
      transformerNode.nodes([])
    }
  }, 1)
}

// drag sprite
// const onSpritesDragEnd = (e: { spriteList: SpriteConfig[] }) => {
//     emits("onSelectedSpriteChange", { names: e.spriteList.map(s => s.name) })
// }
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

#menu > div {
  display: flex;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
}

#menu > div:hover {
  display: flex;
  justify-content: center;
  background-color: #f0f0f0;
}
</style>
