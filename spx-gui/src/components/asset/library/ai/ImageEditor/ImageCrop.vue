<template>
  <div ref="editorContainer" class="container">
    <v-stage v-if="stageConfig != null" ref="stage" :config="stageConfig">
      <v-layer ref="layer">
        <v-image ref="nodeRef" :config="imageConfig" />
        <v-rect
          ref="rectRef"
          :config="rectConfig"
          @transformend="handleTransformEnd"
          @transform="handleTransformEnd"
          @dragend="handleDragEnd"
          @dragmove="handleDragEnd"
        />
        <v-transformer ref="cropHandlerRef" :config="cropHandlerConfig" />
        <v-shape ref="croppedMaskRef" :config="croppedMaskConfig" />
      </v-layer>
    </v-stage>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import type Konva from 'konva'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { KonvaNode } from '../AIBackdropEditor.vue'
import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import { useRenderScale } from './useRenderScale'
import { useCenterPosition } from './useCenterPosition'

const nodeRef = ref<KonvaNode<Konva.Image>>()
const rectRef = ref<KonvaNode<Konva.Rect>>()
const cropHandlerRef = ref<KonvaNode<Konva.Transformer>>()
const croppedMaskRef = ref<KonvaNode<Konva.Shape>>()
const node = computed(() => nodeRef.value?.getNode())
const rect = computed(() => rectRef.value?.getNode())
const cropHandler = computed(() => cropHandlerRef.value?.getNode())
const croppedMask = computed(() => croppedMaskRef.value?.getNode())

const props = defineProps<{
  stageConfig: Konva.StageConfig
  image: HTMLImageElement
  width: number
  height: number
  fillPercent: number
  /**
   * Initial crop position
   * or a number representing the ratio of the cropped area
   */
  initialCrop?: { x: number; y: number; width: number; height: number } | number
}>()

const { renderScale, updateRenderScale } = useRenderScale(props, false)

const imageSize = computed(() => {
  if (!props.image) {
    return null
  }
  return { width: props.image.width, height: props.image.height }
})

const { position: centerPos, updatePosition: updateCenterPosition } = useCenterPosition(props)

const crop = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0
})

watch(
  imageSize,
  (newSize, oldSize) => {
    const { width, height } = newSize ?? { width: 0, height: 0 }
    updateRenderScale(width, height)
    updateCenterPosition(width * renderScale.value, height * renderScale.value)
    if (oldSize || !props.initialCrop) {
      crop.value.width = width
      crop.value.height = height
      crop.value.x = centerPos.value.x
      crop.value.y = centerPos.value.y
    }
    else if (typeof props.initialCrop === 'number') {
      const expectRatio = props.initialCrop
      const ratio = width / height
      if (ratio > expectRatio) {
        crop.value.width = height * expectRatio
        crop.value.height = height
        crop.value.x = centerPos.value.x + (width - crop.value.width) / 2
        crop.value.y = centerPos.value.y
      } else {
        crop.value.width = width
        crop.value.height = width / expectRatio
        crop.value.x = centerPos.value.x
        crop.value.y = centerPos.value.y + (height - crop.value.height) / 2
      }
    } else {
      crop.value = props.initialCrop
    }
  },
  { immediate: true }
)

onMounted(() => {
  // show the crop handler
  if (!cropHandler.value || !rect.value) {
    return
  }
  cropHandler.value.visible(true)
  cropHandler.value.nodes([rect.value])
})

const handleTransformEnd = () => {
  if (!rect.value) {
    return
  }
  const x = rect.value.x()
  const y = rect.value.y()
  const width = rect.value.width() * rect.value.scaleX()
  const height = rect.value.height() * rect.value.scaleY()
  rect.value.width(width)
  rect.value.height(height)
  rect.value.scaleX(1)
  rect.value.scaleY(1)
  crop.value = { x, y, width: width / renderScale.value, height: height / renderScale.value }
}

const handleDragEnd = () => {
  if (!rect.value) {
    return
  }
  crop.value.x = rect.value.x()
  crop.value.y = rect.value.y()
}

const cropHandlerConfig = computed<TransformerConfig | null>(() => {
  if (!rectConfig.value) {
    return null
  }
  return {
    anchorStyleFunc: ((anchor: Konva.Rect) => {
      anchor.cornerRadius(1)
      anchor.stroke('rgba(11, 192, 207, 1)')
      anchor.strokeWidth(1)
      const width = 20
      const height = 20
      anchor.width(width)
      anchor.height(height)
      const left = ['top-left', 'middle-left', 'bottom-left']
      const right = ['top-right', 'middle-right', 'bottom-right']
      const top = ['top-left', 'top-center', 'top-right']
      const bottom = ['bottom-left', 'bottom-center', 'bottom-right']
      const has = (arr: string[], anchor: Konva.Rect) => arr.some((name) => anchor.hasName(name))
      const offsetX = has(left, anchor) ? -1 : has(right, anchor) ? width + 1 : width / 2
      const offsetY = has(top, anchor) ? -1 : has(bottom, anchor) ? height + 1 : height / 2
      anchor.offsetX(offsetX)
      anchor.offsetY(offsetY)
    }) as TransformerConfig['anchorStyleFunc'],
    borderStroke: 'rgba(11, 192, 207, 1)',
    rotateEnabled: false,
    boundBoxFunc: function (oldBoundBox, newBoundBox) {
      const MIN_WIDTH = 10
      const MIN_HEIGHT = 10
      if (newBoundBox.width < MIN_WIDTH || newBoundBox.height < MIN_HEIGHT) {
        return oldBoundBox
      }
      const left = centerPos.value.x
      const top = centerPos.value.y
      const right = centerPos.value.x + (imageSize.value?.width ?? 0) * renderScale.value
      const bottom = centerPos.value.y + (imageSize.value?.height ?? 0) * renderScale.value
      const x = Math.max(left, Math.min(right, newBoundBox.x))
      const y = Math.max(top, Math.min(bottom, newBoundBox.y))
      const width = Math.max(MIN_WIDTH, Math.min(right - x, newBoundBox.width))
      const height = Math.max(MIN_HEIGHT, Math.min(bottom - y, newBoundBox.height))
      newBoundBox.x = x
      newBoundBox.y = y
      newBoundBox.width = width
      newBoundBox.height = height
      return newBoundBox
    }
  }
})

const imageConfig = computed<ImageConfig | null>(() => {
  return {
    spriteName: 'main-backdrop',
    image: props.image ?? undefined,
    draggable: false,
    offsetX: 0,
    offsetY: 0,
    visible: true,
    x: centerPos.value.x,
    y: centerPos.value.y,
    rotation: 0,
    width: imageSize.value?.width ?? 0,
    height: imageSize.value?.height ?? 0,
    scaleX: renderScale.value ?? 1,
    scaleY: renderScale.value ?? 1
  } satisfies ImageConfig
})

const rectConfig = computed<Konva.RectConfig | null>(() => {
  return {
    x: crop.value.x,
    y: crop.value.y,
    width: crop.value.width * renderScale.value,
    height: crop.value.height * renderScale.value,
    fill: 'rgba(0, 0, 0, 0)',
    stroke: 'rgba(11, 192, 207, 1)',
    draggable: true,
    listening: true,
    dragBoundFunc: function (pos) {
      const left = centerPos.value.x
      const top = centerPos.value.y
      const right =
        centerPos.value.x + ((imageSize.value?.width ?? 0) - crop.value.width) * renderScale.value
      const bottom =
        centerPos.value.y + ((imageSize.value?.height ?? 0) - crop.value.height) * renderScale.value
      const x = Math.max(left, Math.min(right, pos.x))
      const y = Math.max(top, Math.min(bottom, pos.y))
      return { x, y }
    }
  } satisfies Konva.RectConfig
})

const croppedMaskConfig = computed<Konva.ShapeConfig | null>(() => {
  return {
    x: 0,
    y: 0,
    width: props.width,
    height: props.height,
    listening: false,
    sceneFunc: function (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      const { x: cx, y: cy, width, height } = crop.value
      ctx.moveTo(0, 0)
      ctx.lineTo(props.width, 0)
      ctx.lineTo(props.width, props.height)
      ctx.lineTo(0, props.height)
      ctx.closePath()
      ctx.moveTo(cx - 1, cy - 1)
      ctx.lineTo(cx - 1, cy + height * renderScale.value + 1)
      ctx.lineTo(cx + width * renderScale.value + 1, cy + height * renderScale.value + 1)
      ctx.lineTo(cx + width * renderScale.value + 1, cy - 1)
      ctx.closePath()

      ctx.fill()
    }
  } satisfies Konva.ShapeConfig
})
/**
 * Get the edited image
 */
const getImage = () => {
  return new Promise<HTMLImageElement>((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = crop.value.width
    canvas.height = crop.value.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    const img = new Image()
    img.src = props.image.src
    img.onload = () => {
      ctx.drawImage(
        img,
        (crop.value.x - centerPos.value.x) / renderScale.value,
        (crop.value.y - centerPos.value.y) / renderScale.value,
        crop.value.width,
        crop.value.height,
        0,
        0,
        crop.value.width,
        crop.value.height
      )
      const newImg = new Image()
      newImg.src = canvas.toDataURL()
      newImg.onload = () => {
        resolve(newImg)
      }
    }
  })
}

defineExpose({
  getImage
})
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 0;
}
</style>
