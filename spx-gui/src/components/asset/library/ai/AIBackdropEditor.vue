<template>
  <div ref="editorContainer" class="container">
    <v-stage
      v-if="editMode === 'preview' && stageConfig != null && !loading"
      ref="stage"
      :config="stageConfig"
    >
      <v-layer ref="layer">
        <v-image ref="nodeRef" :config="config" @dragend="handleDragEnd" />
      </v-layer>
    </v-stage>
    <ImageResize
      v-if="editMode === 'resize' && image !== null && stageConfig != null && !loading"
      ref="imageResize"
      :image="image"
      :stage-config="stageConfig"
      :width="mapWidth"
      :height="mapHeight"
      :fill-percent="FILL_PERCENT"
    />
    <ImageCrop
      v-if="editMode === 'crop' && image !== null && stageConfig != null && !loading"
      ref="imageCrop"
      :image="image"
      :stage-config="stageConfig"
      :width="mapWidth"
      :height="mapHeight"
      :fill-percent="FILL_PERCENT"
    />
    <CheckerboardBackground class="background" />
  </div>
</template>

<script lang="ts">
/**
 * `vue-konva` does not provide types for ref to Konva nodes,
 * so we define a type to workaround this
 *
 * @example
 * ```html
 * <v-image ref="imageRef" />
 * ```
 * ...
 * ```ts
 * const imageRef = ref<KonvaNode<Konva.Image>>()
 * imageRef.value.getNode() // returns Konva.Image instance
 * ```
 */
export interface KonvaNode<T extends Konva.Node = Konva.Node> {
  getNode(): T
  getStage(): Konva.Stage
}
</script>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { isContentReady, type TaggedAIAssetData } from '@/apis/aigc'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import { backdrop2Asset, cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import type { AssetType } from '@/apis/asset'
import type { Backdrop } from '@/models/backdrop'
import { useFileImg } from '@/utils/file'
import type Konva from 'konva'
import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'
import type { EditorAction } from './AIPreviewModal.vue'
import type { ButtonType } from '@/components/ui/UIButton.vue'
import {
  CancelOutlined,
  CheckFilled,
  CropFilled,
  PhotoSizeSelectLargeFilled,
  SaveFilled
} from '@vicons/material'
import { fromBlob } from '@/models/common/file'
import { ExportOutlined } from '@vicons/antd'
import ImageResize from './ImageEditor/ImageResize.vue'
import type { StageConfig } from 'konva/lib/Stage'
import { useConfirmDialog } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useRenderScale } from './ImageEditor/useRenderScale'
import { useAnimatedCenterPosition } from './ImageEditor/useCenterPosition'
import ImageCrop from './ImageEditor/ImageCrop.vue'

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
const node = computed(() => nodeRef.value?.getNode())

const editMode = ref<'resize' | 'crop' | 'preview'>('preview')

const imageResize = ref<InstanceType<typeof ImageResize> | null>(null)
const imageCrop = ref<InstanceType<typeof ImageCrop> | null>(null)
const activeEditor = computed(
  () =>
    ({
      preview: null,
      resize: imageResize.value,
      crop: imageCrop.value
    })[editMode.value]
)

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

const FILL_PERCENT = 0.8

const { renderScale, updateRenderScale } = useRenderScale({
  width: mapWidth,
  height: mapHeight,
  fillPercent: FILL_PERCENT
})

const handleDragEnd = () => {
  if (!node.value || !initialImageSize.value) {
    return
  }
  immediateUpdatePosition(node.value.x(), node.value.y())
  updateCenterPosition(
    initialImageSize.value.width * renderScale.value,
    initialImageSize.value.height * renderScale.value
  )
}

const initialImageSize = computed(() => {
  if (!image.value) {
    return null
  }
  const width = image.value.width
  const height = image.value.height
  return { width: width, height: height }
})

const {
  currentPos: centerPos,
  updateCenterPosition,
  immediateUpdatePosition
} = useAnimatedCenterPosition({
  width: mapWidth,
  height: mapHeight
})

watch(initialImageSize, () => {
  const { width, height } = initialImageSize.value ?? { width: 0, height: 0 }
  updateRenderScale(width, height)
  updateCenterPosition(width * renderScale.value, height * renderScale.value)
})

const stageConfig = computed<StageConfig | null>(() => {
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
  } as StageConfig
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
    x: centerPos.value.x,
    y: centerPos.value.y,
    rotation: 0,
    width: initialImageSize.value?.width ?? 0,
    height: initialImageSize.value?.height ?? 0,
    scaleX: renderScale.value ?? 1,
    scaleY: renderScale.value ?? 1
  } satisfies ImageConfig
  return config
})

const saveChanges = async () => {
  if (!activeEditor.value) {
    return
  }
  const img = await activeEditor.value.getImage()
  document.body.appendChild(img)
  // img element to blob
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.drawImage(img, 0, 0, img.width, img.height)
  canvas.toBlob(async (blob) => {
    if (!blob) {
      return
    }
    // blob to file
    const file = fromBlob(backdrop.value!.img.name, blob)
    // save file
    backdrop.value!.img = file
  })
}

const saveToAsset = async () => {
  // backdrop to asset
  const newAssetData = await backdrop2Asset(backdrop.value!)
  // save asset
  props.asset.files = newAssetData.files
  props.asset.filesHash = newAssetData.filesHash
}

const exportImage = async () => {
  if (!node.value) {
    return
  }
  node.value.toImage({
    callback: (img) => {
      const a = document.createElement('a')
      a.href = img.src
      a.download = backdrop.value?.img.name ?? 'image.png'
      a.click()
    }
  })
}

const confirm = useConfirmDialog()
const i18n = useI18n()
// TODO: do not upload to kodo when switch mode?
const actions = computed(() =>
  (
    [
      {
        name: 'edit',
        label: { zh: '缩放', en: 'Resize' },
        icon: PhotoSizeSelectLargeFilled,
        type: (editMode.value === 'resize' ? 'primary' : 'secondary') satisfies ButtonType,
        action: async () => {
          saveChanges()
          editMode.value = editMode.value === 'resize' ? 'preview' : 'resize'
        }
      },
      {
        name: 'crop',
        label: { zh: '裁剪', en: 'Crop' },
        icon: CropFilled,
        type: (editMode.value === 'crop' ? 'primary' : 'secondary') satisfies ButtonType,
        action: async () => {
          saveChanges()
          editMode.value = editMode.value === 'crop' ? 'preview' : 'crop'
        }
      },
      editMode.value !== 'preview' && {
        name: 'cancel',
        label: { zh: '取消', en: 'Cancel' },
        icon: CancelOutlined,
        type: 'secondary' satisfies ButtonType,
        action: async () => {
          if (editMode.value !== 'preview') {
            confirm({
              content: i18n.t({ zh: '是否放弃当前编辑？', en: 'Discard current changes?' }),
              title: i18n.t({ zh: '提示', en: 'Warning' }),
              cancelText: i18n.t({ zh: '取消', en: 'Cancel' }),
              confirmText: i18n.t({ zh: '确定', en: 'Confirm' })
            })
              .then(() => {
                editMode.value = 'preview'
              })
              .catch(() => {})
          }
        }
      },
      editMode.value !== 'preview' && {
        name: 'confirm',
        label: { zh: '确定', en: 'Confirm' },
        icon: CheckFilled,
        type: 'secondary' satisfies ButtonType,
        action: () => {
          saveChanges()
          editMode.value = 'preview'
        }
      },
      editMode.value === 'preview' && {
        name: 'save',
        label: { zh: '保存', en: 'Save' },
        icon: SaveFilled,
        type: 'secondary' satisfies ButtonType,
        action: saveToAsset
      },
      editMode.value === 'preview' && {
        name: 'export',
        label: { zh: '导出', en: 'Export' },
        icon: ExportOutlined,
        type: 'secondary' satisfies ButtonType,
        action: exportImage
      }
    ] satisfies (EditorAction | false)[]
  ).filter(Boolean)
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

:deep(.background) {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: -1;
}

:deep(.info-tip) {
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
