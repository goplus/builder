<template>
  <div ref="editorContainer" class="container">
    <v-stage v-if="stageConfig != null" ref="stage" :config="stageConfig">
      <v-layer ref="layer">
        <v-image
          ref="nodeRef"
          :config="config"
          @transformend="handleTransformEnd"
          @dragend="handleDragEnd"
        />
        <v-transformer ref="resizeTransformerRef" :config="resizeTransformerConfig" />
      </v-layer>
    </v-stage>
    <div class="resize-info info-tip">
      <span>{{ resizedImageSize?.width }} x {{ resizedImageSize?.height }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import type Konva from 'konva'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { KonvaNode } from '../AIBackdropEditor.vue'
import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import { useRenderScale } from './useRenderScale'
import { useAnimatedCenterPosition } from './useCenterPosition'

const nodeRef = ref<KonvaNode<Konva.Image>>()
const resizeTransformerRef = ref<KonvaNode<Konva.Transformer>>()
const node = computed(() => nodeRef.value?.getNode())
const resizeTransformer = computed(() => resizeTransformerRef.value?.getNode())

const props = defineProps<{
  stageConfig: Konva.StageConfig
  image: HTMLImageElement
  width: number
  height: number
  fillPercent: number
}>()

const { renderScale, updateRenderScale } = useRenderScale(props)

const initialImageSize = computed(() => {
  if (!props.image) {
    return null
  }
  return { width: props.image.width, height: props.image.height }
})

const resizedImageSize = ref(initialImageSize.value)

const {
  currentPos: centerPos,
  updateCenterPosition,
  immediateUpdatePosition
} = useAnimatedCenterPosition(props)

const handleTransformEnd = () => {
  if (!node.value) {
    return
  }
  // since we are resizing the image, we need to apply the scale to the size
  // and reset the scale to 1;
  // the scaleX() and scaleY() contains the renderScale factor,
  // so we need to remove it
  const scaleX = node.value.scaleX() / renderScale.value
  const scaleY = node.value.scaleY() / renderScale.value
  const width = Math.max(10, Math.round(node.value.width() * scaleX))
  const height = Math.max(10, Math.round(node.value.height() * scaleY))
  renderScale.value = 1
  node.value.scaleX(1)
  node.value.scaleY(1)
  resizedImageSize.value = {
    width: width,
    height: height
  }
  immediateUpdatePosition(node.value.x(), node.value.y())
}

const handleDragEnd = () => {
  if (!node.value || !resizedImageSize.value) {
    return
  }
  immediateUpdatePosition(node.value.x(), node.value.y())
  // trigger the update of the center position
  resizedImageSize.value = {
    ...resizedImageSize.value
  }
}

onMounted(() => {
  // show the resize transformer
  if (!resizeTransformer.value || !node.value) {
    return
  }
  resizeTransformer.value.visible(true)
  resizeTransformer.value.nodes([node.value])
})

watch(
  initialImageSize,
  (newSize) => {
    const { width, height } = newSize ?? { width: 0, height: 0 }
    resizedImageSize.value = newSize
    updateRenderScale(width, height)
    updateCenterPosition(width * renderScale.value, height * renderScale.value)
  },
  { immediate: true }
)

watch(resizedImageSize, () => {
  const { width, height } = resizedImageSize.value ?? { width: 0, height: 0 }
  updateRenderScale(width, height)
  updateCenterPosition(width * renderScale.value, height * renderScale.value)
})

const resizeTransformerConfig = computed<TransformerConfig | null>(() => {
  if (!config.value) {
    return null
  }
  return {
    anchorStyleFunc: ((anchor: Konva.Rect) => {
      anchor.cornerRadius(10)
      anchor.stroke('rgba(11, 192, 207, 1)')
      if (anchor.hasName('top-center') || anchor.hasName('bottom-center')) {
        anchor.height(6)
        anchor.offsetY(3)
        anchor.width(30)
        anchor.offsetX(15)
      }
      if (anchor.hasName('middle-left') || anchor.hasName('middle-right')) {
        anchor.height(30)
        anchor.offsetY(15)
        anchor.width(6)
        anchor.offsetX(3)
      }
    }) as TransformerConfig['anchorStyleFunc'],
    borderStroke: 'rgba(11, 192, 207, 1)',
    rotateEnabled: false,
    boundBoxFunc: function (oldBoundBox, newBoundBox) {
      const MIN_WIDTH = 10
      const MIN_HEIGHT = 10
      if (newBoundBox.width < MIN_WIDTH || newBoundBox.height < MIN_HEIGHT) {
        return oldBoundBox
      }

      return newBoundBox
    }
  }
})

const config = computed<ImageConfig | null>(() => {
  return {
    spriteName: 'main-backdrop',
    image: props.image ?? undefined,
    draggable: true,
    offsetX: 0,
    offsetY: 0,
    visible: true,
    x: centerPos.value.x,
    y: centerPos.value.y,
    rotation: 0,
    width: resizedImageSize.value?.width ?? 0,
    height: resizedImageSize.value?.height ?? 0,
    scaleX: renderScale.value ?? 1,
    scaleY: renderScale.value ?? 1
  } satisfies ImageConfig
})

/**
 * Get the edited image
 */
const getImage = () => {
  return new Promise<HTMLImageElement>((resolve) => {
    node.value?.width(resizedImageSize.value?.width ?? node.value.width())
    node.value?.height(resizedImageSize.value?.height ?? node.value.height())
    node.value?.toImage({
      callback: (img) => {
        img.width = resizedImageSize.value?.width ?? img.width
        img.height = resizedImageSize.value?.height ?? img.height
        resolve(img)
      }
    })
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
