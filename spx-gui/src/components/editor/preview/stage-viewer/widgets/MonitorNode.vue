<template>
  <v-group
    ref="groupNodeRef"
    :config="groupConfig"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @transformstart="handleTransformStart"
    @transform="handleTransform"
    @transformend="handleTransformEnd"
    @click="handleClick"
  >
    <v-rect :config="rectConfig" />
    <v-text ref="labelTextRef" :config="labelTextConfig" />
    <v-shape :config="labelValueSepConfig" />
    <v-rect :config="valueBgConfig" />
    <v-text ref="valueTextRef" :config="valueTextConfig" />
  </v-group>
</template>
<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { TextConfig, Text } from 'konva/lib/shapes/Text'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { Group, GroupConfig } from 'konva/lib/Group'
import type { ShapeConfig } from 'konva/lib/Shape'
import type { Size } from '@/models/common'
import { round } from '@/utils/utils'
import { useUIVariables } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { getNodeId } from '@/components/editor/common/viewer/common'
import type { WidgetLocalConfig } from '@/components/editor/common/viewer/quick-config/utils'
import type { TransformOp } from '@/components/editor/common/viewer/custom-transformer'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'

type ConfigGetter = {
  get x(): number
  get y(): number
  get size(): number
  get visible(): boolean
}

const props = defineProps<{
  localConfig: WidgetLocalConfig
  viewportSize: Size
}>()

const emits = defineEmits<{
  updateTransformOp: [op: TransformOp | null]
}>()

const uiVariables = useUIVariables()
const editorCtx = useEditorCtx()

const nodeId = computed(() => getNodeId(props.localConfig))
const groupNodeRef = ref<KonvaNodeInstance<Group>>()
const labelTextRef = ref<KonvaNodeInstance<Text>>()
const valueTextRef = ref<KonvaNodeInstance<Text>>()
const labelTextWidth = ref(0)
const valueTextWidth = ref(0)

const snapshotRef = ref<ConfigGetter | null>(null)
const configGetter = computed(() => {
  if (snapshotRef.value != null) return snapshotRef.value
  return props.localConfig
})

// text change triggers node-size change, we need to trigger transformer update manually.
// It's a Transformer bug that it doesn't update correctly when attached node size changed caused by text content change.
async function triggerTransformerUpdate() {
  await nextTick()
  // The Transformer binds some events after selecting a node, and we use these events to force a transformer update.
  groupNodeRef.value?.getNode().fire('widthChange')
}

const minLabelTextWidth = 16 // px, minimum width when label is empty

function updateLabelTextWidth() {
  if (labelTextRef.value == null) return
  labelTextWidth.value = Math.max(labelTextRef.value.getNode().getWidth(), minLabelTextWidth)
  triggerTransformerUpdate()
}

const minValueTextWidth = 32 // px, minimum width when variableName is empty

function updateValueTextWidth() {
  if (valueTextRef.value == null) return
  valueTextWidth.value = Math.max(valueTextRef.value.getNode().getWidth(), minValueTextWidth)
  triggerTransformerUpdate()
}

onMounted(() => {
  updateLabelTextWidth()
  updateValueTextWidth()

  // Fix wrong zIndex after renaming
  // TODO: get rid of warning when renaming:
  // ```
  // Konva warning: Node has no parent. zIndex parameter is ignored.
  // Konva warning: Unexpected value 2 for zIndex property. zIndex is just index of a node in children of its parent. Expected value is from 0 to 1.
  // ```
  const zIndex = editorCtx.project.stage.widgetsZorder.indexOf(props.localConfig.id)
  if (zIndex >= 0) {
    labelTextRef.value!.getNode().zIndex(zIndex)
  }
})

function syncLocalConfigByShape(node: Konva.Node) {
  const localConfig = props.localConfig
  localConfig.setSize(toSize(node))
  const { x, y } = toPosition(node)
  localConfig.setX(x)
  localConfig.setY(y)
  props.localConfig.sync()
}

function handleDragMove(e: KonvaEventObject<unknown>) {
  const localConfig = props.localConfig
  const { x, y } = toPosition(e.target)
  localConfig.setX(x)
  localConfig.setY(y)
  emits('updateTransformOp', 'move')
}
function handleDragEnd(e: KonvaEventObject<unknown>) {
  syncLocalConfigByShape(e.target)
}

function handleTransformStart() {
  snapshotRef.value = {
    x: props.localConfig.x,
    y: props.localConfig.y,
    size: props.localConfig.size,
    visible: props.localConfig.visible
  }
}
function handleTransform(e: KonvaEventObject<unknown>) {
  const localConfig = props.localConfig
  const { size: oldSize, x: oldX, y: oldY } = configGetter.value
  const size = toSize(e.target)
  if (oldSize !== size) {
    localConfig.setSize(size)
    emits('updateTransformOp', 'scale')
  }
  const { x, y } = toPosition(e.target)
  if (oldX !== x || oldY !== y) {
    localConfig.setX(x)
    localConfig.setY(y)
  }
}
function handleTransformEnd(e: KonvaEventObject<unknown>) {
  syncLocalConfigByShape(e.target)
  snapshotRef.value = null
}

const paddingX = 6 // px
const paddingY = 5 // px
const fontSize = 12 // px
const lineHeight = 1.5 // ratio
const labelValueSepWidth = 13 // px
const labelValueSepGap = 2 // px, gap between [label, sep, value]
const height = fontSize * lineHeight + paddingY * 2

const labelSectionWidth = computed(() => {
  return labelTextWidth.value + labelValueSepGap + labelValueSepWidth + labelValueSepGap
})

const groupConfig = computed<GroupConfig>(() => {
  const { visible, x, y, size } = configGetter.value
  return {
    nodeId: nodeId.value,
    visible,
    draggable: true,
    x: props.viewportSize.width / 2 + x,
    y: props.viewportSize.height / 2 - y,
    scaleX: size,
    scaleY: size
  }
})

const rectConfig = computed<RectConfig>(() => {
  const width = paddingX + labelSectionWidth.value + valueTextWidth.value + paddingX
  return {
    width,
    height,
    fill: uiVariables.color.blue.main,
    cornerRadius: 8
  }
})

const labelTextConfig = computed<TextConfig>(() => {
  const { label } = props.localConfig
  return {
    text: label,
    x: paddingX,
    y: paddingY,
    lineHeight,
    fill: uiVariables.color.grey[100]
  }
})

watch(labelTextConfig, () => nextTick().then(updateLabelTextWidth))

const labelValueSepConfig = computed<ShapeConfig>(() => {
  return {
    x: paddingX + labelTextWidth.value + labelValueSepGap,
    y: 0,
    sceneFunc: function (context, shape) {
      // Draw a triangle as separator
      context.beginPath()
      context.moveTo(labelValueSepWidth, 0)
      context.lineTo(labelValueSepWidth, height)
      context.lineTo(0, height)
      context.closePath()
      context.fillStrokeShape(shape)
    },
    fill: uiVariables.color.turquoise[200]
  }
})

const valueBgConfig = computed<RectConfig>(() => {
  return {
    x: paddingX + labelSectionWidth.value - labelValueSepGap,
    y: 0,
    width: labelValueSepGap + valueTextWidth.value + paddingX,
    height,
    fill: uiVariables.color.turquoise[200],
    cornerRadius: [0, 8, 8, 0]
  }
})

const valueTextConfig = computed<TextConfig>(() => {
  const { target, variableName } = props.localConfig
  let text: string
  if (variableName === '') {
    text = ''
  } else {
    const prefix = target !== '' ? `${target}.` : ''
    text = `{${prefix}${variableName}}`
  }
  return {
    text,
    x: paddingX + labelSectionWidth.value,
    y: paddingY,
    lineHeight,
    fill: uiVariables.color.blue.main
  }
})

watch(valueTextConfig, () => nextTick().then(updateValueTextWidth))

function toPosition(node: Konva.Node) {
  const x = round(node.x() - props.viewportSize.width / 2)
  const y = round(props.viewportSize.height / 2 - node.y())
  return { x, y }
}

function toSize(node: Konva.Node) {
  const size = round(node.scaleX(), 2)
  return size
}

function handleClick() {
  editorCtx.state.selectWidget(props.localConfig.id)
}
</script>
