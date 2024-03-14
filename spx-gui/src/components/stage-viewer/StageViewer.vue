<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-13 15:09:57
 * @FilePath: \spx-gui\src\components\stage-viewer\StageViewer.vue
 * @Description: 
-->
<template>
  <div id="stage-viewer" ref="stageViewer">
    <div id="menu" ref="menu" @mouseleave="onStageMenuMouseLeave">
      <div @click="moveSprite('up')">{{ $t('layer.up') }}</div>
      <div @click="moveSprite('down')">{{ $t('layer.down') }}</div>
      <div @click="moveSprite('top')">{{ $t('layer.top') }}</div>
      <div @click="moveSprite('bottom')">{{ $t('layer.bottom') }}</div>
    </div>
    <v-stage
      ref="stage"
      :config="{
        width: props.width,
        height: props.height,
        scaleX: scale,
        scaleY: scale
      }"
      @mousedown="onStageClick"
      @contextmenu="onStageMenu"
    >
      <BackdropLayer
        :backdrop-config="props.project.backdrop"
        :offset-config="{
          offsetX: (props.width / scale - spxMapConfig.width) / 2,
          offsetY: (props.height / scale - spxMapConfig.height) / 2
        }"
        :map-config="spxMapConfig"
        @on-scene-loadend="onSceneLoadend"
      />
      <SpriteLayer
        :offset-config="{
          offsetX: (props.width / scale - spxMapConfig.width) / 2,
          offsetY: (props.height / scale - spxMapConfig.height) / 2
        }"
        :sprite-list="props.project.sprite.list"
        :zorder="props.project.backdrop.config.zorder"
        :selected-sprite-names="stageSelectSpritesName"
        :map-config="spxMapConfig"
        @on-sprite-drag-move="onSpriteDragMove"
        @on-sprite-apperance-change="onSpriteApperanceChange"
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
          :config="{
            enabledAnchors: [],
            borderDash: [6, 6],
            rotateEnabled: false,
            draggable: true
          }"
        />
        <!-- The top layer's controller of the selected sprite,and the controller's and the controllable size is consistent with the sprite. -->
        <template v-for="[spritename, selectSprite] of selectedControllerMap" :key="spritename">
          <v-rect
            :config="{
              controller: true,
              spriteName: spritename,
              fill: 'rgba(0,0,0,0)',
              draggable: true,
              width: selectSprite.rect.width,
              height: selectSprite.rect.height,
              x: selectSprite.rect.x,
              y: selectSprite.rect.y,
              offsetX: selectSprite.rect.offsetX,
              offsetY: selectSprite.rect.offsetY,
              scaleX: selectSprite.rect.scaleX,
              scaleY: selectSprite.rect.scaleY,
              rotation: selectSprite.rect.rotation
            }"
          >
          </v-rect>
        </template>
      </v-layer>
    </v-stage>
  </div>
</template>
<script setup lang="ts">
import SpriteLayer from './SpriteLayer.vue'
import BackdropLayer from './BackdropLayer.vue'
import { computed, ref, watch, withDefaults } from 'vue'
import type { StageViewerEmits, StageViewerProps } from './index'
import type { KonvaEventObject, Node } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import type { RectConfig } from 'konva/lib/shapes/Rect.js'
import type { Layer } from 'konva/lib/Layer'
import type { SpriteDragMoveEvent, SpriteApperanceChangeEvent, MapConfig } from './common'

// the controller which is top layer,store the corresponding node information and the information of its control node
interface Controller {
  node: Node
  rect: RectConfig
}

// ----------props & emit------------------------------------
const props = withDefaults(defineProps<StageViewerProps>(), {
  height: 400, // container height
  width: 400 // container width
})
const emits = defineEmits<StageViewerEmits>()

const stageViewer = ref()
// instance of konva's stage & menu
const stage = ref<Stage>()
const transformer = ref()
const menu = ref()

//  which sprite are selected
const stageSelectSpritesName = ref<string[]>([])
//  Control node‘s information corresponding to stageSelectSpritesName
const selectedControllerMap = ref<Map<String, Controller>>(new Map())

// get spx map size
const spxMapConfig = ref<MapConfig>({
  width: 400,
  height: 400
})

// get the scale of stage viewer
// container size or stage size changes will recalculate the actual size
const scale = computed(() => {
  if (spxMapConfig.value && stageViewer.value) {
    const widthScale = props.width / spxMapConfig.value.width
    const heightScale = props.height / spxMapConfig.value.height
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

// sync the selected sprite name of prop to stageSelectSpritesName
watch(
  () => props.selectedSpriteNames,
  (spriteNames) => {
    if (spriteNames.length === 0 || !spriteNames) {
      stageSelectSpritesName.value = []
      return
    }
    if (
      spriteNames.length === stageSelectSpritesName.value.length &&
      spriteNames.every((name, index) => name === stageSelectSpritesName.value[index])
    ) {
      return
    }

    stageSelectSpritesName.value = spriteNames
  }
)

//stageSelectSpritesName change tigger the transformer show or hide
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
      emits('onSelectedSpritesChange', { names: stageSelectSpritesName.value })
    }
    showSelectedTranformer()
  }
)

// when the stageSelectSpritesName change,update the info of the controller
watch(
  () => stageSelectSpritesName.value,
  () => {
    const map = new Map<String, { node: Node; rect: RectConfig }>()
    stageSelectSpritesName.value.forEach((name) => {
      const node = stage.value?.getStage().findOne((node: Node) => {
        return node.getAttr('spriteName') === name
      })
      if (!node) return
      map.set(name, {
        node: node,
        rect: {
          width: node.attrs.image.width,
          height: node.attrs.image.height,
          x: node.attrs.x,
          y: node.attrs.y,
          scaleX: node.attrs.scaleX,
          scaleY: node.attrs.scaleY,
          offsetX: node.attrs.offsetX,
          offsetY: node.attrs.offsetY,
          rotation: node.attrs.rotation
        }
      })
    })
    selectedControllerMap.value = map
  }
)

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

// show stage menu,when click a sprite
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
    // after entering the menu element, the menu will disappear after leaving the menu.
    // The problem of entering the menu immediately after clicking is avoided by offsetting the menu by 4 pixels to the bottom and right
    menu.value.style.top = stage.value.getStage().getPointerPosition()!.y + 4 + 'px'
    menu.value.style.left = stage.value.getStage().getPointerPosition()!.x + 4 + 'px'
  }
}

// hide stage menu
const onStageMenuMouseLeave = () => {
  menu.value.style.display = 'none'
  stageSelectSpritesName.value = []
}

const onStageClick = (e: KonvaEventObject<MouseEvent>) => {
  // clear choose sprite
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
  }

  menu.value.style.display = 'none'
}

const showSelectedTranformer = () => {
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
  // choosed nodes in tranformer
  const transformerNode = transformer.value.getNode()
  const layer = stage.value.getStage().findOne('.sprite') as Layer
  console.log(layer)

  if (nodes.length) {
    transformerNode.nodes([...nodes])
  } else {
    transformerNode.nodes([])
  }
}

const onSpriteDragMove = (e: SpriteDragMoveEvent) => {
  const controller = selectedControllerMap.value.get(e.sprite.name)
  if (controller) {
    updateController(controller as Controller, e.event.target.attrs)
  }
}

const onSpriteApperanceChange = (e: SpriteApperanceChangeEvent) => {
  const controller = selectedControllerMap.value.get(e.sprite.name)
  if (controller) {
    updateController(controller as Controller, e.node.attrs)
  }
}

const updateController = (controller: Controller, attrs: any) => {
  controller.rect.x = attrs.x
  controller.rect.y = attrs.y
  controller.rect.scaleX = attrs.scaleX
  controller.rect.scaleY = attrs.scaleY
  controller.rect.rotation = attrs.rotation
  controller.rect.offsetX = attrs.offsetX
  controller.rect.offsetY = attrs.offsetY
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
