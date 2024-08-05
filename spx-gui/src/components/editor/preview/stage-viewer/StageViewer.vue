<template>
  <div ref="conatiner" class="stage-viewer">
    <v-stage
      v-if="stageConfig != null"
      ref="stageRef"
      :config="stageConfig"
      @mousedown="handleStageMousedown"
      @contextmenu="handleContextMenu"
    >
      <v-layer>
        <v-rect v-if="konvaBackdropConfig" :config="konvaBackdropConfig"></v-rect>
      </v-layer>
      <v-layer>
        <SpriteItem
          v-for="sprite in visibleSprites"
          :key="sprite.name"
          :sprite="sprite"
          :map-size="mapSize!"
          :sprites-ready-map="spritesReadyMap"
        />
      </v-layer>
      <!-- <v-layer>
        <SpriteTransformer :sprites-ready-map="spritesReadyMap" />
      </v-layer> -->
    </v-stage>
    <UIDropdown trigger="manual" :visible="menuVisible" :pos="menuPos" placement="bottom-start">
      <UIMenu>
        <UIMenuItem @click="moveSprite('up')">{{ $t(moveActionNames.up) }}</UIMenuItem>
        <UIMenuItem @click="moveSprite('top')">{{ $t(moveActionNames.top) }}</UIMenuItem>
        <UIMenuItem @click="moveSprite('down')">{{ $t(moveActionNames.down) }}</UIMenuItem>
        <UIMenuItem @click="moveSprite('bottom')">{{ $t(moveActionNames.bottom) }}</UIMenuItem>
      </UIMenu>
    </UIDropdown>
    <UILoading :visible="spritesAndBackdropLoading" cover />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import { UIDropdown, UILoading, UIMenu, UIMenuItem } from '@/components/ui'
import { useContentSize } from '@/utils/dom'
import { RotationStyle, type Sprite } from '@/models/sprite'
import { useFileUrl } from '@/utils/file'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import SpriteItem from './SpriteItem.vue'
import { MapMode } from '@/models/stage'
import Konva from 'konva'
import type { TransformerConfig } from 'konva/lib/shapes/Transformer'

const editorCtx = useEditorCtx()
const conatiner = ref<HTMLElement | null>(null)
const containerSize = useContentSize(conatiner)

const stageRef = ref<Konva.Stage>()
const mapSize = computed(() => editorCtx.project.stage.getMapSize())

const spritesReadyMap = reactive(new Map<string, boolean>())

/** containerSize / mapSize */
const scale = computed(() => {
  if (containerSize.width.value == null || containerSize.height.value == null) return null
  if (mapSize.value == null) return null
  const widthScale = containerSize.width.value / mapSize.value.width
  const heightScale = containerSize.height.value / mapSize.value.height
  return Math.min(widthScale, heightScale)
})

const stageConfig = computed(() => {
  if (scale.value == null) return null
  if (mapSize.value == null) return null
  const width = mapSize.value.width * scale.value
  const height = mapSize.value.height * scale.value
  return {
    width,
    height,
    scale: {
      x: scale.value,
      y: scale.value
    }
  }
})

const backdropImg = ref<HTMLImageElement | null>(null)
const [backdropSrc, backdropSrcLoading] = useFileUrl(
  () => editorCtx.project.stage.defaultBackdrop?.img
)
watchEffect(() => {
  if (backdropSrc.value == null) return
  const img = new Image()
  img.src = backdropSrc.value
  img.addEventListener('load', () => {
    backdropImg.value = img
  })
})

const konvaBackdropConfig = computed(() => {
  if (backdropImg.value == null || stageConfig.value == null) {
    return null
  }

  const stageWidth = mapSize.value.width
  const stageHeight = mapSize.value.height
  const imageWidth = backdropImg.value.width
  const imageHeight = backdropImg.value.height

  if (editorCtx.project.stage.mapMode === MapMode.fillRatio) {
    const scaleX = stageWidth / imageWidth
    const scaleY = stageHeight / imageHeight
    const scale = Math.max(scaleX, scaleY) // Use max to cover the entire stage

    const width = imageWidth * scale
    const height = imageHeight * scale
    const x = (stageWidth - width) / 2
    const y = (stageHeight - height) / 2

    return {
      fillPatternImage: backdropImg.value,
      width: stageWidth,
      height: stageHeight,
      fillPatternRepeat: 'no-repeat',
      fillPatternX: x,
      fillPatternY: y,
      fillPatternScaleX: scale,
      fillPatternScaleY: scale
    }
  } else if (editorCtx.project.stage.mapMode === MapMode.repeat) {
    const offsetX = (stageWidth - imageWidth) / 2
    const offsetY = (stageHeight - imageHeight) / 2

    return {
      fillPatternImage: backdropImg.value,
      width: stageWidth,
      height: stageHeight,
      fillPatternRepeat: 'repeat',
      fillPatternX: offsetX,
      fillPatternY: offsetY,
      fillPatternScaleX: 1,
      fillPatternScaleY: 1
    }
  }
  console.warn('Unsupported map mode:', editorCtx.project.stage.mapMode)
  return null
})

const spritesAndBackdropLoading = computed(() => {
  if (backdropSrcLoading.value || !backdropImg.value) return true
  return editorCtx.project.sprites.some((s) => !spritesReadyMap.get(s.name))
})

const visibleSprites = computed(() => {
  const { zorder, sprites } = editorCtx.project
  return zorder.map((name) => sprites.find((s) => s.name === name)).filter(Boolean) as Sprite[]
})

const menuVisible = ref(false)
const menuPos = ref({ x: 0, y: 0 })

class MyTransformer extends Konva.Transformer {
  flipButtons?: {
    left: Konva.Rect
    right: Konva.Rect
  }
  onFlip?: (side: 'left' | 'right') => void

  constructor(config?: TransformerConfig | undefined, onFlip?: (side: 'left' | 'right') => void) {
    super(config)
    this.onFlip = onFlip
  }

  _createElements() {
    super._createElements()

    const left = new Konva.Rect({
      width: 10,
      height: 10,
      fill: 'red',
      cornerRadius: 5
    })

    const right = new Konva.Rect({
      width: 10,
      height: 10,
      fill: 'blue',
      cornerRadius: 5
    })

    left.on('click', () => {
      console.log('click left')
      this.onFlip?.('left')
    })
    right.on('click', () => {
      console.log('click right')
      this.onFlip?.('right')
    })

    this.add(left)
    this.add(right)
    this.flipButtons = {
      left,
      right
    }
  }

  update(): void {
    super.update()

    if (this.flipButtons) {
      const { left, right } = this.flipButtons

      left.x(-5)
      left.y(this.height() / 2 - left.height() / 2)

      right.x(this.width() - 5)
      right.y(this.height() / 2 - right.height() / 2)
    }
  }
}

watch(
  () => editorCtx.project.selectedSprite,
  (selectedSprite, old, onCleanup) => {
    if (!stageRef.value || !selectedSprite) return
    const transformerLayer = new Konva.Layer()
    const transformer = new MyTransformer(
      {
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
      },
      (side) => {
        console.log(side)
        selectedSprite.setHeading(side === 'left' ? -90 : 90)
      }
    )
    const stage = stageRef.value.getStage()
    const selectedNode = stage
      .getStage()
      .findOne((node: Node) => node.getAttr('spriteName') === selectedSprite.name)
    if (!selectedNode) {
      console.warn('selectedNode not found')
      return
    }

    transformer.nodes([selectedNode])
    transformerLayer.add(transformer)
    stage.add(transformerLayer)

    onCleanup(() => {
      transformerLayer.remove()
    })
  }
)

function handleContextMenu(e: KonvaEventObject<MouseEvent>) {
  e.evt.preventDefault()

  // Ignore right click on backdrop.
  // Konva.Rect is a subclass of Konva.Shape.
  // Currently we have all sprites as Konva.Shape and backdrop as Konva.Rect.
  if (e.target instanceof Konva.Rect) return

  if (stageRef.value == null || e.target.parent == null) return
  const stage: Stage = stageRef.value.getStage()
  const pointerPos = stage.getPointerPosition()
  if (pointerPos == null) return
  const stagePos = stage.getContent().getBoundingClientRect()
  const offsetY = -8 // offset for dropdown menu
  menuPos.value = {
    x: stagePos.x + pointerPos.x,
    y: stagePos.y + pointerPos.y + offsetY
  }
  menuVisible.value = true
}

function handleStageMousedown() {
  if (menuVisible.value) menuVisible.value = false
}

const moveActionNames = {
  up: { en: 'Bring forward', zh: '向前移动' },
  top: { en: 'Bring to front', zh: '移到最前' },
  down: { en: 'Send backward', zh: '向后移动' },
  bottom: { en: 'Send to back', zh: '移到最后' }
}

function moveSprite(direction: 'up' | 'down' | 'top' | 'bottom') {
  const project = editorCtx.project
  const selectedSprite = project.selectedSprite
  if (selectedSprite == null) return
  const action = { name: moveActionNames[direction] }
  project.history.doAction(action, () => {
    if (direction === 'up') {
      project.upSpriteZorder(selectedSprite.name)
    } else if (direction === 'down') {
      project.downSpriteZorder(selectedSprite.name)
    } else if (direction === 'top') {
      project.topSpriteZorder(selectedSprite.name)
    } else if (direction === 'bottom') {
      project.bottomSpriteZorder(selectedSprite.name)
    }
  })
  menuVisible.value = false
}
</script>
<style scoped>
.stage-viewer {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: var(--ui-border-radius-1);
  background-image: url(@/components/project/bg.svg);
  background-position: center;
  background-repeat: repeat;
  background-size: contain;
  position: relative;

  overflow: hidden;
}
</style>
