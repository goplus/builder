<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import type { Circle } from 'konva/lib/shapes/Circle'
import type { StageConfig } from 'konva/lib/Stage'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { Text, TextConfig } from 'konva/lib/shapes/Text'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { GroupConfig } from 'konva/lib/Group'
import type { LayerConfig } from 'konva/lib/Layer'
import type { Rect, RectConfig } from 'konva/lib/shapes/Rect'
import { useAsyncComputed } from '@/utils/utils'
import { useI18n } from '@/utils/i18n'
import { useRenderableImage } from '@/utils/img-rendering'
import { useContentSize } from '@/utils/dom'
import { useMessageHandle } from '@/utils/exception'
import { getContentBoundingRect } from '@/utils/img'
import { toNativeFile } from '@/models/common/file'
import { CollisionShapeType, type Sprite } from '@/models/spx/sprite'
import type { Pivot as CostumePivot } from '@/models/spx/costume'
import { UIButton } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import type { CustomTransformer, CustomTransformerConfig } from '../common/viewer/custom-transformer'
import { getPivotMarkerConfigs } from '../common/pivot-marker'
import {
  applyPivotCollisionEdit,
  getColliderBounds,
  getColliderPolygonPoints,
  getColliderPreviewTransform
} from './collider'
import CheckerboardBackground from './CheckerboardBackground.vue'

const props = defineProps<{
  sprite: Sprite
  collisionEditingEnabled: boolean
}>()

const emits = defineEmits<{
  updateSuccess: []
}>()

const editorCtx = useEditorCtx()

const i18n = useI18n()
const wrapper = ref<HTMLDivElement | null>(null)
const wrapperSize = useContentSize(wrapper)

const defaultCostume = computed(() => {
  const c = props.sprite.defaultCostume
  if (c == null) throw new Error('Sprite has no default costume')
  return c
})
const [image] = useRenderableImage(() => defaultCostume.value.img)
const costumeSize = useAsyncComputed(() => defaultCostume.value.getSize())
const canvasSize = computed(() => {
  if (costumeSize.value == null) return null
  if (!worldPreview.value) return { width: costumeSize.value.width * 2, height: costumeSize.value.height * 2 }
  const pivot = pivotPos.value
  const extentX = Math.max(
    pivot.x,
    costumeSize.value.width - pivot.x,
    Math.abs(colliderPos.value.x - pivot.x),
    Math.abs(colliderPos.value.x + colliderSize.value.width - pivot.x)
  )
  const extentY = Math.max(
    pivot.y,
    costumeSize.value.height - pivot.y,
    Math.abs(colliderPos.value.y - pivot.y),
    Math.abs(colliderPos.value.y + colliderSize.value.height - pivot.y)
  )
  const diameter = Math.max(1, Math.hypot(extentX, extentY) * 2.5 * props.sprite.size)
  return { width: diameter, height: diameter }
})

/** Whether the values have been modified */
const dirty = ref(false)
const colliderDirty = ref(false)
const worldPreview = ref(false)
const canEditCollider = computed(
  () =>
    props.collisionEditingEnabled &&
    !worldPreview.value &&
    [CollisionShapeType.Auto, CollisionShapeType.Rect, CollisionShapeType.Circle].includes(
      props.sprite.collisionShapeType
    )
)
const isCircle = computed(() => props.sprite.collisionShapeType === CollisionShapeType.Circle)
const polygonPoints = ref<number[]>([])
/** Position of the pivot in the layer */
const pivotPos = ref<CostumePivot>({ x: 0, y: 0 })
/** Size of the collider bounding box in the layer */
const colliderSize = ref({ width: 0, height: 0 })
/** Position of collider bounding box in the layer */
const colliderPos = ref({ x: 0, y: 0 })

async function resetValues() {
  const sprite = props.sprite
  pivotPos.value = defaultCostume.value.pivot
  let bounds = getColliderBounds(sprite, pivotPos.value)
  if (sprite.collisionShapeType === CollisionShapeType.Auto) {
    const { img, bitmapResolution } = defaultCostume.value
    const rect = await getContentBoundingRect(await toNativeFile(img))
    bounds = {
      x: rect.x / bitmapResolution,
      y: rect.y / bitmapResolution,
      width: rect.width / bitmapResolution,
      height: rect.height / bitmapResolution
    }
  }
  colliderSize.value = { width: bounds?.width ?? 0, height: bounds?.height ?? 0 }
  colliderPos.value = { x: bounds?.x ?? 0, y: bounds?.y ?? 0 }
  polygonPoints.value =
    sprite.collisionShapeType === CollisionShapeType.Polygon ? getColliderPolygonPoints(sprite, pivotPos.value) : []
  colliderDirty.value = false
  dirty.value = false
}

watch(
  [pivotPos, colliderSize, colliderPos],
  () => {
    dirty.value = true
  },
  { flush: 'sync' }
)

watch(
  [colliderSize, colliderPos],
  () => {
    colliderDirty.value = true
  },
  { flush: 'sync' }
)

watch(() => props.sprite, resetValues, { immediate: true })

const stageScale = computed(() => {
  if (canvasSize.value == null || wrapperSize.value == null) return 1
  const scaleX = wrapperSize.value.width / canvasSize.value.width
  const scaleY = wrapperSize.value.height / canvasSize.value.height
  return Math.min(scaleX, scaleY)
})

const stageConfig = computed<StageConfig | null>(() => {
  if (wrapper.value == null || canvasSize.value == null || wrapperSize.value == null) return null
  const scale = stageScale.value
  const x = (wrapperSize.value.width - canvasSize.value.width * scale) / 2
  const y = (wrapperSize.value.height - canvasSize.value.height * scale) / 2
  return {
    container: wrapper.value,
    width: wrapperSize.value.width,
    height: wrapperSize.value.height,
    scale: { x: scale, y: scale },
    x,
    y
  }
})

const layerConfig = computed<LayerConfig | null>(() => {
  if (canvasSize.value == null || costumeSize.value == null) return null
  return {
    x: canvasSize.value.width / 2,
    y: canvasSize.value.height / 2,
    offsetX: worldPreview.value ? pivotPos.value.x : costumeSize.value.width / 2,
    offsetY: worldPreview.value ? pivotPos.value.y : costumeSize.value.height / 2,
    ...(worldPreview.value
      ? getColliderPreviewTransform(props.sprite, defaultCostume.value.faceRight)
      : { rotation: 0, scaleX: 1, scaleY: 1 }),
    imageSmoothingEnabled: false
  }
})

const imgConfig = computed(() => {
  if (image.value == null || costumeSize.value == null || canvasSize.value == null) return null
  return {
    image: image.value ?? undefined,
    width: costumeSize.value.width,
    height: costumeSize.value.height,
    x: 0,
    y: 0,
    opacity: 0.6
  } satisfies ImageConfig
})

const pivotGroupConfig = computed(() => {
  // Keep size (of circle & title) unchanged when stage is scaled
  const scale = 1 / stageScale.value
  return {
    x: pivotPos.value.x,
    y: pivotPos.value.y,
    draggable: !worldPreview.value,
    scale: {
      x: scale,
      y: scale
    }
  } satisfies GroupConfig
})

const pivotMarkerConfigs = getPivotMarkerConfigs({ interactive: true })

function handlePivotCircleGroupDragEnd(e: KonvaEventObject<unknown>) {
  pivotPos.value = { x: e.target.x(), y: e.target.y() }
}

const pivotTitleConfig = computed(
  () =>
    ({
      text: i18n.t({ en: 'Pivot', zh: '参考点' }),
      fontSize: 12,
      fill: '#333',
      width: 80,
      offsetX: 40,
      offsetY: 24,
      align: 'center'
    }) satisfies TextConfig
)

const colliderNode = ref<KonvaNodeInstance<Rect | Circle>>()

const colliderConfig = computed(
  () =>
    ({
      width: colliderSize.value.width,
      height: colliderSize.value.height,
      x: colliderPos.value.x,
      y: colliderPos.value.y,
      draggable: canEditCollider.value,
      fill: 'rgba(0, 128, 255, 0.1)',
      stroke: '#0080ff',
      strokeWidth: 1,
      strokeScaleEnabled: false,
      cornerRadius: props.sprite.collisionShapeType === CollisionShapeType.Capsule ? colliderSize.value.width / 2 : 0
    }) satisfies RectConfig
)

const colliderTitle = ref<KonvaNodeInstance<Text>>()

const colliderTitleConfig = computed(() => {
  // Keep title size unchanged when stage is scaled
  const scale = 1 / stageScale.value
  return {
    text: i18n.t({ en: 'Collider', zh: '碰撞体' }),
    fontSize: 12,
    fill: '#333',
    x: colliderPos.value.x,
    y: colliderPos.value.y,
    offsetY: 24,
    scale: {
      x: scale,
      y: scale
    }
  } satisfies TextConfig
})

const colliderTransformer = ref<KonvaNodeInstance<CustomTransformer>>()

const colliderTransformerConfig = computed<CustomTransformerConfig>(() => ({
  rotationStyle: 'none',
  centeredScaling: false,
  keepRatio: isCircle.value
}))

watchEffect(() => {
  if (colliderNode.value == null || colliderTransformer.value == null) return
  const colliderNodeNode = colliderNode.value.getNode()
  const transformerNode = colliderTransformer.value.getNode()
  transformerNode.nodes([colliderNodeNode])
})

function syncColliderTitlePos(e: KonvaEventObject<unknown>) {
  const node = e.target
  const titleNode = colliderTitle.value?.getNode()
  if (titleNode == null) return
  titleNode.x(node.x() - (isCircle.value ? (node.width() * node.scaleX()) / 2 : 0))
  titleNode.y(node.y() - (isCircle.value ? (node.height() * node.scaleY()) / 2 : 0))
}

function handleColliderDragEnd(e: KonvaEventObject<unknown>) {
  colliderPos.value = {
    x: e.target.x() - (isCircle.value ? colliderSize.value.width / 2 : 0),
    y: e.target.y() - (isCircle.value ? colliderSize.value.height / 2 : 0)
  }
}

function handleColliderTransformEnd(e: KonvaEventObject<unknown>) {
  const node = e.target
  const width = node.width() * node.scaleX()
  const height = isCircle.value ? width : node.height() * node.scaleY()
  colliderSize.value = { width, height }
  colliderPos.value = isCircle.value
    ? { x: node.x() - width / 2, y: node.y() - height / 2 }
    : { x: node.x(), y: node.y() }
  node.scaleX(1)
  node.scaleY(1)
}

const { fn: save } = useMessageHandle(
  async () => {
    await editorCtx.state.history.doAction(
      {
        name: props.collisionEditingEnabled
          ? { en: 'Update sprite pivot and collision', zh: '更新精灵参考点和碰撞体' }
          : { en: 'Update sprite pivot', zh: '更新精灵参考点' }
      },
      () =>
        applyPivotCollisionEdit(
          props.sprite,
          pivotPos.value,
          props.collisionEditingEnabled && colliderDirty.value ? { ...colliderPos.value, ...colliderSize.value } : null
        )
    )
    dirty.value = false
    colliderDirty.value = false
    emits('updateSuccess')
  },
  { en: 'Failed to update sprite pivot or collision', zh: '更新精灵参考点或碰撞体失败' },
  { en: 'Save sprite pivot and collision successfully', zh: '更新精灵参考点和碰撞体成功' }
)
</script>

<template>
  <div class="h-full w-full flex flex-col items-center gap-xl">
    <div v-if="collisionEditingEnabled" class="flex items-center gap-md text-sm">
      <UIButton
        v-radar="{ name: 'collider-view-button', desc: 'Switch between costume editing and transformed preview' }"
        type="white"
        @click="worldPreview = !worldPreview"
      >
        {{
          worldPreview
            ? $t({ en: 'Edit in costume coordinates', zh: '在造型坐标中编辑' })
            : $t({ en: 'Preview sprite transform', zh: '预览精灵变换' })
        }}
      </UIButton>
      <span>{{
        worldPreview
          ? $t({ en: 'Initial size and rotation · Preview only', zh: '初始大小与旋转 · 仅预览' })
          : $t({ en: 'Costume coordinates · Before sprite size and rotation', zh: '造型坐标 · 未应用精灵大小与旋转' })
      }}</span>
    </div>
    <div v-if="collisionEditingEnabled" class="text-sm text-text">
      {{
        $t(
          {
            [CollisionShapeType.None]: { en: 'None', zh: '无' },
            [CollisionShapeType.Auto]: { en: 'Automatic', zh: '自动' },
            [CollisionShapeType.Circle]: { en: 'Circle', zh: '圆形' },
            [CollisionShapeType.Rect]: { en: 'Rectangle', zh: '矩形' },
            [CollisionShapeType.Capsule]: { en: 'Capsule', zh: '胶囊' },
            [CollisionShapeType.Polygon]: { en: 'Polygon', zh: '多边形' }
          }[sprite.collisionShapeType]
        )
      }}
      <template v-if="sprite.collisionShapeType === CollisionShapeType.None">
        · {{ $t({ en: 'No physical collider', zh: '无物理碰撞体' }) }}</template
      >
      <template
        v-else-if="
          sprite.collisionShapeType === CollisionShapeType.Capsule ||
          sprite.collisionShapeType === CollisionShapeType.Polygon
        "
      >
        · {{ $t({ en: 'Shape preview only; pivot can be edited', zh: '形状仅预览；可编辑参考点' }) }}</template
      >
      <template v-else-if="sprite.collisionShapeType === CollisionShapeType.Auto">
        · {{ $t({ en: 'Editing the bounds creates a rectangle', zh: '编辑边界会创建矩形碰撞体' }) }}
      </template>
      <template v-else-if="isCircle">
        · {{ $t({ en: 'Radius', zh: '半径' }) }}: {{ Math.round((colliderSize.width / 2) * 100) / 100 }} ·
        {{ $t({ en: 'World diameter', zh: '世界直径' }) }}:
        {{ Math.round(colliderSize.width * sprite.size * 100) / 100 }}</template
      >
    </div>
    <div ref="wrapper" class="relative h-full w-full flex-1 overflow-hidden rounded-md">
      <CheckerboardBackground class="absolute inset-0" />
      <v-stage v-if="stageConfig != null" :config="stageConfig">
        <v-layer v-if="layerConfig != null" :config="layerConfig">
          <v-image v-if="imgConfig != null" :config="imgConfig" />
          <template v-if="collisionEditingEnabled && sprite.collisionShapeType !== CollisionShapeType.None">
            <v-text v-if="!worldPreview" ref="colliderTitle" :config="colliderTitleConfig" />
            <v-circle
              v-if="isCircle"
              ref="colliderNode"
              :config="{
                ...colliderConfig,
                x: colliderPos.x + colliderSize.width / 2,
                y: colliderPos.y + colliderSize.height / 2,
                radius: colliderSize.width / 2
              }"
              @dragmove="syncColliderTitlePos"
              @dragend="handleColliderDragEnd"
              @transform="syncColliderTitlePos"
              @transformend="handleColliderTransformEnd"
            />
            <v-line
              v-else-if="sprite.collisionShapeType === CollisionShapeType.Polygon"
              :config="{
                points: polygonPoints,
                closed: true,
                fill: colliderConfig.fill,
                stroke: colliderConfig.stroke,
                strokeWidth: 1,
                strokeScaleEnabled: false
              }"
            />
            <v-rect
              v-else
              ref="colliderNode"
              :config="colliderConfig"
              @dragmove="syncColliderTitlePos"
              @dragend="handleColliderDragEnd"
              @transform="syncColliderTitlePos"
              @transformend="handleColliderTransformEnd"
            />
            <v-custom-transformer
              v-if="canEditCollider"
              ref="colliderTransformer"
              :config="colliderTransformerConfig"
            />
          </template>
          <v-group v-if="!worldPreview" :config="pivotGroupConfig" @dragend="handlePivotCircleGroupDragEnd">
            <v-group :config="pivotMarkerConfigs.drawingGroup">
              <template v-for="(shape, idx) in pivotMarkerConfigs.shapes" :key="`pivot-marker-${idx}`">
                <v-circle v-if="shape.kind === 'circle'" :config="shape.config" />
                <v-rect v-else :config="shape.config" />
              </template>
            </v-group>
            <v-text :config="pivotTitleConfig" />
          </v-group>
        </v-layer>
      </v-stage>
    </div>
    <UIButton
      v-radar="{
        name: 'save-button',
        desc: collisionEditingEnabled ? 'Save sprite pivot and collision' : 'Save sprite pivot'
      }"
      type="green"
      :disabled="!dirty"
      @click="save"
    >
      {{ $t({ en: 'Save', zh: '保存' }) }}
    </UIButton>
  </div>
</template>
