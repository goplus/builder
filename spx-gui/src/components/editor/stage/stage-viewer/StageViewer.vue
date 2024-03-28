<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-05 14:09:40
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-13 15:09:57
 * @FilePath: \spx-gui\src\components\stage-viewer\StageViewer.vue
 * @Description: 
-->
<template>
  <div id="stage-viewer">
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
        :stage="props.project.stage"
        :offset-config="{
          offsetX: (props.width / scale - mapSize.width) / 2,
          offsetY: (props.height / scale - mapSize.height) / 2
        }"
        :map-size="mapSize"
      />
      <SpriteLayer
        :offset-config="{
          offsetX: (props.width / scale - mapSize.width) / 2,
          offsetY: (props.height / scale - mapSize.height) / 2
        }"
        :sprite-list="props.project.sprites"
        :zorder="props.project.zorder"
        :selected-sprite-names="stageSelectSpritesName"
        :map-size="mapSize"
        @on-sprite-drag-move="onSpriteDragMove"
        @on-sprite-apperance-change="onSpriteApperanceChange"
      />
      <v-layer
        :config="{
          name: 'controller',
          x: (props.width / scale - mapSize.width) / 2,
          y: (props.height / scale - mapSize.height) / 2
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
import { computed, effect, ref, watch, withDefaults } from 'vue'
import type { StageViewerEmits, StageViewerProps } from './index'
import type { KonvaEventObject, Node } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import type { RectConfig } from 'konva/lib/shapes/Rect.js'
import type { SpriteDragMoveEvent, SpriteApperanceChangeEvent } from './common'
import type { Size } from '@/models/common'

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

// instance of konva's stage & menu
const stage = ref<Stage>()
const transformer = ref()
const menu = ref()

//  which sprite are selected
const stageSelectSpritesName = ref<string[]>([])
//  Control node‘s information corresponding to stageSelectSpritesName
const selectedControllerMap = ref<Map<String, Controller>>(new Map())

// get spx map size
const mapSize = ref<Size>({
  width: 400,
  height: 400
})

// get the scale of stage viewer
// container size or stage size changes will recalculate the actual size
const scale = computed(() => {
  const widthScale = props.width / mapSize.value.width
  const heightScale = props.height / mapSize.value.height
  const scale = Math.min(widthScale, heightScale, 1)
  return scale
})

effect(async () => {
  mapSize.value = await props.project.stage.getMapSize()
})

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
  () => {
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

  const project = props.project
  const spriteName = stageSelectSpritesName.value[0]
  const node = stage.value!.getStage().findOne((node: Node) => {
    return node.getAttr('spriteName') === spriteName
  }) as Node
  if (direction === 'up') {
    project.upSpriteZorder(spriteName)
    node.moveUp()
  } else if (direction === 'down') {
    project.downSpriteZorder(spriteName)
    node.moveDown()
  } else if (direction === 'top') {
    project.topSpriteZorder(spriteName)
    node.moveToTop()
  } else if (direction === 'bottom') {
    project.bottomSpriteZorder(spriteName)
    node.moveToBottom()
  } else {
    return
  }

  menu.value.style.display = 'none'
}

const showSelectedTranformer = () => {
  if (!stage.value) return
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
