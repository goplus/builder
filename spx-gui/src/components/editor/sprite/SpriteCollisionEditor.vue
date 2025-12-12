<script setup lang="ts">
import { computed, effect, ref, watch } from 'vue'
import type { StageConfig } from 'konva/lib/Stage'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { Text, TextConfig } from 'konva/lib/shapes/Text'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { GroupConfig } from 'konva/lib/Group'
import type { LayerConfig } from 'konva/lib/Layer'
import type { Rect, RectConfig } from 'konva/lib/shapes/Rect'
import type { CircleConfig } from 'konva/lib/shapes/Circle'
import { useAsyncComputed } from '@/utils/utils'
import { useI18n } from '@/utils/i18n'
import { useFileImg } from '@/utils/file'
import { useContentSize } from '@/utils/dom'
import { getContentBoundingRect } from '@/utils/img'
import { toNativeFile } from '@/models/common/file'
import { CollisionShapeType, type Sprite } from '@/models/sprite'
import type { Pivot as CostumePivot } from '@/models/costume'
import type { CustomTransformer, CustomTransformerConfig } from '../common/viewer/custom-transformer'
import CheckerboardBackground from './CheckerboardBackground.vue'
import { UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import type { Project } from '@/models/project'

const props = defineProps<{
  project: Project
  sprite: Sprite
}>()

const emits = defineEmits<{
  updateSuccess: []
}>()

const i18n = useI18n()
const wrapper = ref<HTMLDivElement | null>(null)
const wrapperSize = useContentSize(wrapper)

const defaultCostume = computed(() => {
  const c = props.sprite.defaultCostume
  if (c == null) throw new Error('Sprite has no default costume')
  return c
})
const [image] = useFileImg(() => defaultCostume.value.img)
const costumeSize = useAsyncComputed(() => defaultCostume.value.getSize())
const canvasSize = computed(() => {
  if (costumeSize.value == null) return null
  return {
    width: costumeSize.value?.width * 2,
    height: costumeSize.value?.height * 2
  }
})

/** Whether the values have been modified */
const dirty = ref(false)
/** Position of the pivot in the layer */
const pivotPos = ref<CostumePivot>({ x: 0, y: 0 })
/** Size of the collider bounding box in the layer */
const colliderSize = ref({ width: 0, height: 0 })
/** Position of collider bounding box in the layer */
const colliderPos = ref({ x: 0, y: 0 })

async function resetValues() {
  const sprite = props.sprite
  pivotPos.value = defaultCostume.value.pivot
  switch (sprite.collisionShapeType) {
    case CollisionShapeType.None:
    case CollisionShapeType.Auto: {
      const { img, bitmapResolution } = defaultCostume.value
      const rect = await getContentBoundingRect(await toNativeFile(img))
      colliderSize.value = { width: rect.width / bitmapResolution, height: rect.height / bitmapResolution }
      colliderPos.value = {
        x: rect.x / bitmapResolution,
        y: rect.y / bitmapResolution
      }
      break
    }
    case CollisionShapeType.Rect:
      colliderSize.value = {
        width: sprite.collisionShapeParams[0] ?? 0,
        height: sprite.collisionShapeParams[1] ?? 0
      }
      colliderPos.value = {
        x: sprite.collisionPivot.x + pivotPos.value.x - colliderSize.value.width / 2,
        y: -sprite.collisionPivot.y + pivotPos.value.y - colliderSize.value.height / 2
      }
      break
    default:
      console.warn('Unsupported collider shape type:', sprite.collisionShapeType)
  }
  dirty.value = false
}

watch(
  [pivotPos, colliderSize, colliderPos],
  () => {
    dirty.value = true
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
    x: (canvasSize.value.width - costumeSize.value.width) / 2,
    y: (canvasSize.value.height - costumeSize.value.height) / 2,
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
    draggable: true,
    scale: {
      x: scale,
      y: scale
    }
  } satisfies GroupConfig
})

function handlePivotCircleGroupDragEnd(e: KonvaEventObject<unknown>) {
  pivotPos.value = { x: e.target.x(), y: e.target.y() }
}

const pivotCircleConfig = computed(
  () =>
    ({
      radius: 8,
      fill: 'rgba(10, 165, 190, 1)',
      stroke: '#fff',
      strokeWidth: 2,
      shadowColor: 'rgba(51, 51, 51, 0.2)',
      shadowBlur: 4,
      shadowOffset: { x: 0, y: 2 }
    }) satisfies CircleConfig
)

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

const colliderRect = ref<KonvaNodeInstance<Rect>>()

const colliderRectConfig = computed(
  () =>
    ({
      width: colliderSize.value.width,
      height: colliderSize.value.height,
      x: colliderPos.value.x,
      y: colliderPos.value.y,
      fill: 'rgba(0, 128, 255, 0.1)'
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

const colliderRectTransformer = ref<KonvaNodeInstance<CustomTransformer>>()

const colliderRectTransformerConfig = computed<CustomTransformerConfig>(() => ({
  rotationStyle: 'none',
  centeredScaling: false,
  keepRatio: false
}))

effect(() => {
  if (colliderRect.value == null || colliderRectTransformer.value == null) return
  const colliderRectNode = colliderRect.value.getNode()
  const transformerNode = colliderRectTransformer.value.getNode()
  transformerNode.nodes([colliderRectNode])
})

function syncColliderTitlePos(e: KonvaEventObject<unknown>) {
  const node = e.target
  const titleNode = colliderTitle.value?.getNode()
  if (titleNode == null) return
  titleNode.x(node.x())
  titleNode.y(node.y())
}

function handleColliderRectDragEnd(e: KonvaEventObject<unknown>) {
  colliderPos.value = { x: e.target.x(), y: e.target.y() }
}

function handleColliderRectTransformEnd(e: KonvaEventObject<unknown>) {
  const node = e.target
  const width = node.width() * node.scaleX()
  const height = node.height() * node.scaleY()
  colliderSize.value = { width, height }
  colliderPos.value = { x: node.x(), y: node.y() }
  node.scaleX(1)
  node.scaleY(1)
}

const { fn: handleConfirm } = useMessageHandle(
  async () => {
    const sprite = props.sprite
    const defaultCostume = props.sprite.defaultCostume
    if (defaultCostume == null) throw new Error('Sprite has no default costume')

    await props.project.history.doAction({ name: { en: 'Update sprite collision', zh: '更新精灵碰撞' } }, () => {
      sprite.applyCostumesPivotChange({
        x: pivotPos.value.x - defaultCostume.pivot.x,
        y: pivotPos.value.y - defaultCostume.pivot.y
      })
      sprite.setCollisionPivot({
        x: colliderPos.value.x + colliderSize.value.width / 2 - pivotPos.value.x,
        y: -(colliderPos.value.y + colliderSize.value.height / 2 - pivotPos.value.y)
      })
      sprite.setCollisionShapeRect(colliderSize.value.width, colliderSize.value.height)
    })
    dirty.value = false
    emits('updateSuccess')
  },
  {
    en: 'Failed to update sprite collision',
    zh: '更新精灵碰撞失败'
  },
  {
    en: 'Save sprite collision successfully',
    zh: '更新精灵碰撞成功'
  }
)
</script>

<template>
  <div class="sprite-collision-editor">
    <div ref="wrapper" class="wrapper">
      <CheckerboardBackground class="background" />
      <v-stage v-if="stageConfig != null" :config="stageConfig">
        <v-layer v-if="layerConfig != null" :config="layerConfig">
          <v-image v-if="imgConfig != null" :config="imgConfig" />
          <v-text ref="colliderTitle" :config="colliderTitleConfig" />
          <v-rect
            ref="colliderRect"
            :config="colliderRectConfig"
            @dragmove="syncColliderTitlePos"
            @dragend="handleColliderRectDragEnd"
            @transform="syncColliderTitlePos"
            @transformend="handleColliderRectTransformEnd"
          />
          <v-custom-transformer ref="colliderRectTransformer" :config="colliderRectTransformerConfig" />
          <v-group :config="pivotGroupConfig" @dragend="handlePivotCircleGroupDragEnd">
            <v-text :config="pivotTitleConfig" />
            <v-circle :config="pivotCircleConfig" />
          </v-group>
        </v-layer>
      </v-stage>
    </div>
    <UIButton
      v-radar="{ name: 'Save button', desc: 'Click to save sprite collision' }"
      color="success"
      :disabled="!dirty"
      @click="handleConfirm"
    >
      {{ $t({ en: 'Save', zh: '保存' }) }}
    </UIButton>
  </div>
</template>

<style lang="scss" scoped>
.sprite-collision-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 100%;
}
.wrapper {
  flex: 1;
  width: 100%;
  height: 100%;
  border-radius: var(--ui-border-radius-2);
  position: relative;
  overflow: hidden;
}
.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
</style>
