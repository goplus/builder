<template>
  <div ref="editorContainer" class="container">
    <v-stage v-if="stageConfig != null && !loading" ref="stage" :config="stageConfig">
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
    <div v-if="editMode === 'resize'" class="resize-info info-tip">
      <span>{{ resizedImageSize?.width }} x {{ resizedImageSize?.height }}</span>
    </div>
    <CheckerboardBackground class="background" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { isContentReady, type TaggedAIAssetData } from '@/apis/aigc'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import type { AssetType } from '@/apis/asset'
import type { Backdrop } from '@/models/backdrop'
import { useFileImg } from '@/utils/file'
import type Konva from 'konva'
import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'
import type { EditorAction } from './AIPreviewModal.vue'
import type { ButtonType } from '@/components/ui/UIButton.vue'
import { PhotoSizeSelectLargeFilled } from '@vicons/material'

// `vue-konva` does not provide types for ref to Konva nodes
interface KonvaNode<T extends Konva.Node = Konva.Node> {
  getNode(): T
  getStage(): Konva.Stage
}

const props = defineProps<{
  asset: TaggedAIAssetData<AssetType.Backdrop>
}>()

const backdrop = useAsyncComputed<Backdrop | undefined>(() => {
  if (!props.asset[isContentReady]) {
    return new Promise((resolve) => resolve(undefined))
  }
  return cachedConvertAssetData(props.asset as Required<TaggedAIAssetData<AssetType.Backdrop>>)
})

const [image, loading] = useFileImg(() => backdrop.value?.img)

const editorContainer = ref<HTMLElement>()
const stage = ref<Konva.Stage>()
const layer = ref<Konva.Layer>()
const nodeRef = ref<KonvaNode<Konva.Image>>()
const resizeTransformerRef = ref<KonvaNode<Konva.Transformer>>()
const node = computed(() => nodeRef.value?.getNode())
const resizeTransformer = computed(() => resizeTransformerRef.value?.getNode())
const editMode = ref<'resize' | 'preview'>('preview')

const mapWidth = ref(800)
const mapHeight = ref(600)

const updateMapSize = () => {
  if (!editorContainer.value) {
    return
  }
  mapWidth.value = editorContainer.value.clientWidth
  mapHeight.value = editorContainer.value.clientHeight
}

onMounted(() => {
  updateMapSize()
  window.addEventListener('resize', updateMapSize)
})

const stageConfig = computed(() => {
  if (!editorContainer.value) {
    return null
  }
  return {
    width: mapWidth.value,
    height: mapHeight.value,
    scale: {
      x: 1,
      y: 1
    }
  }
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
    rotateEnabled: false
  }
})

const showTransformer = () => {
  if (!resizeTransformer.value) {
    return
  }
  if (!nodeRef.value) {
    return
  }
  if (editMode.value === 'resize') {
    resizeTransformer.value.visible(true)
    resizeTransformer.value.nodes([nodeRef.value.getNode()])
    return
  }
  resizeTransformer.value.visible(false)
}

watch(editMode, () => {
  showTransformer()
})

const FILL_PERCENT = 0.8
// renderScale is used to scale the image to fit the map
// so that the image is always visible and user can still resize the image 
// even if it is larger than the map
const renderScale = ref(1)
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
  const width = Math.max(1, Math.round(node.value.width() * scaleX))
  const height = Math.max(1, Math.round(node.value.height() * scaleY))
  renderScale.value = 1
  node.value.scaleX(1)
  node.value.scaleY(1)
  resizedImageSize.value = {
    width: width,
    height: height
  }
  currentPos.value = { x: node.value.x(), y: node.value.y() }
}

const handleDragEnd = () => {
  if (!node.value || !resizedImageSize.value) {
    return
  }
  currentPos.value = { x: node.value.x(), y: node.value.y() }
  // trigger a re-render to update the target position
  resizedImageSize.value = {
    ...resizedImageSize.value
  }
}

const initialImageSize = computed(() => {
  if (!image.value) {
    return null
  }
  const width = image.value.width
  const height = image.value.height
  return { width: width, height: height }
})

const resizedImageSize = ref(initialImageSize.value)

watch(
  initialImageSize,
  () => {
    resizedImageSize.value = initialImageSize.value
  },
  { immediate: true }
)

watch(resizedImageSize, () => {
  const { width, height } = resizedImageSize.value ?? { width: 0, height: 0 }
  const scale = Math.min(mapWidth.value / width, mapHeight.value / height) * FILL_PERCENT
  if (scale < 1) {
    renderScale.value = scale
  }
})

const currentPos = ref({ x: 0, y: 0 })

const targetPos = computed(() => {
  const { width, height } = resizedImageSize.value ??
    initialImageSize.value ?? { width: 0, height: 0 }
  return {
    x: mapWidth.value / 2 - (width * renderScale.value) / 2,
    y: mapHeight.value / 2 - (height * renderScale.value) / 2
  }
})

const animateToTarget = () => {
  const step = 0.1
  currentPos.value.x += (targetPos.value.x - currentPos.value.x) * step
  currentPos.value.y += (targetPos.value.y - currentPos.value.y) * step

  if (
    Math.abs(targetPos.value.x - currentPos.value.x) >= step ||
    Math.abs(targetPos.value.y - currentPos.value.y) >= step
  ) {
    requestAnimationFrame(animateToTarget)
  }
}

watch(targetPos, () => {
  animateToTarget()
})

const config = computed<ImageConfig | null>(() => {
  if (!backdrop.value) {
    return null
  }
  const { name } = backdrop.value
  const config = {
    spriteName: name,
    image: image.value ?? undefined,
    draggable: true,
    offsetX: 0,
    offsetY: 0,
    visible: true,
    x: currentPos.value.x,
    y: currentPos.value.y,
    rotation: 0,
    width: resizedImageSize.value?.width ?? 0,
    height: resizedImageSize.value?.height ?? 0,
    scaleX: renderScale.value ?? 1,
    scaleY: renderScale.value ?? 1
  } satisfies ImageConfig
  return config
})

const actions = computed(
  () =>
    [
      {
        name: 'edit',
        label: { zh: '缩放', en: 'Resize' },
        icon: PhotoSizeSelectLargeFilled,
        type: (editMode.value === 'resize' ? 'primary' : 'secondary') satisfies ButtonType,
        action: () => {
          editMode.value = editMode.value === 'resize' ? 'preview' : 'resize'
        }
      }
    ] satisfies EditorAction[]
)

defineExpose({
  actions
})
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: -1;
}

.info-tip {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 5px;
  border-radius: 5px;
  z-index: 1;
}
</style>
