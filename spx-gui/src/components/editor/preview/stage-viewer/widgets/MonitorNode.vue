<template>
  <v-group
    :config="groupConfig"
    @dragmove="notifyUpdateMonitor($event.target)"
    @dragend="handleDragEnd"
    @transform="notifyUpdateMonitor($event.target)"
    @transformend="handleTransformed"
    @open-configor="emit('openConfigor')"
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
import { throttle } from 'lodash'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TextConfig, Text } from 'konva/lib/shapes/Text'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { Stage } from 'konva/lib/Stage'
import type { GroupConfig } from 'konva/lib/Group'
import type { Shape, ShapeConfig } from 'konva/lib/Shape'
import type { Action } from '@/models/project'
import type { Size } from '@/models/common'
import { round } from '@/utils/utils'
import type { Monitor } from '@/models/widget/monitor'
import { useUIVariables } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { getNodeId } from '@/components/editor/common/viewer/common'

const props = defineProps<{
  monitor: Monitor
  viewportSize: Size
  nodeReadyMap: Map<string, boolean>
}>()

const emit = defineEmits<{
  updatePos: [{ x: number; y: number }]
  updateSize: [{ size: number }]
  openConfigor: []
}>()

const uiVariables = useUIVariables()
const editorCtx = useEditorCtx()

const nodeId = computed(() => getNodeId(props.monitor))
const labelTextRef = ref<KonvaNodeInstance<Text>>()
const valueTextRef = ref<KonvaNodeInstance<Text>>()
const labelTextWidth = ref(0)
const valueTextWidth = ref(0)

// text change triggers node-size change, we need to trigger transformer update manually.
// It's a Transformer bug that it doesn't update correctly when attached node size changed causing by text content change
async function triggerTransformerUpdate() {
  props.nodeReadyMap.set(nodeId.value, false)
  await nextTick()
  props.nodeReadyMap.set(nodeId.value, true)
}

function updateLabelTextWidth() {
  if (labelTextRef.value == null) return
  labelTextWidth.value = labelTextRef.value.getNode().getWidth()
  triggerTransformerUpdate()
}

function updateValueTextWidth() {
  if (valueTextRef.value == null) return
  valueTextWidth.value = valueTextRef.value.getNode().getWidth()
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
  const zIndex = editorCtx.project.stage.widgetsZorder.indexOf(props.monitor.id)
  if (zIndex >= 0) {
    labelTextRef.value!.getNode().zIndex(zIndex)
  }
})

function updateMonitor({
  oldSize,
  size,
  oldX,
  x,
  oldY,
  y
}: {
  oldSize: number
  size: number
  oldX: number
  x: number
  oldY: number
  y: number
}) {
  if (oldSize !== size) {
    emit('updateSize', { size })
    return
  }
  if (oldX !== x || oldY !== y) {
    emit('updatePos', { x, y })
  }
}

const notifyUpdateMonitor = throttle((e: Shape | Stage) => {
  const { monitor } = props
  const { x, y } = toPosition(e)
  updateMonitor({
    oldSize: monitor.size,
    size: toSize(e),
    oldX: monitor.x,
    x,
    oldY: monitor.y,
    y
  })
}, 200)

function handleDragEnd(e: KonvaEventObject<unknown>) {
  const sname = props.monitor.name
  handleChange(e, {
    name: { en: `Move widget ${sname}`, zh: `移动控件 ${sname}` }
  })
}

function handleTransformed(e: KonvaEventObject<unknown>) {
  const sname = props.monitor.name
  handleChange(e, {
    name: { en: `Transform widget ${sname}`, zh: `调整控件 ${sname}` }
  })
}

const paddingX = 6 // px
const paddingY = 5 // px
const fontSize = 12 // px
const lineHeight = 1.5 // ratio
const labelValueSepWidth = 13 // px
const labelValueSepGap = 2 // px, gap between [label, sep, value]
const height = fontSize * lineHeight + paddingY * 2

const groupConfig = computed<GroupConfig>(() => {
  const { visible, x, y, size } = props.monitor
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
  const width =
    paddingX +
    labelTextWidth.value +
    labelValueSepGap +
    labelValueSepWidth +
    labelValueSepGap +
    valueTextWidth.value +
    paddingX
  return {
    width,
    height,
    fill: uiVariables.color.blue.main,
    cornerRadius: 8
  }
})

const labelTextConfig = computed<TextConfig>(() => {
  const { label } = props.monitor
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
  const width = labelValueSepGap + valueTextWidth.value + paddingX
  return {
    x: paddingX + labelTextWidth.value + labelValueSepGap + labelValueSepWidth,
    y: 0,
    width,
    height,
    fill: uiVariables.color.turquoise[200],
    cornerRadius: [0, 8, 8, 0]
  }
})

const valueTextConfig = computed<TextConfig>(() => {
  const { variableName } = props.monitor
  return {
    text: variableName === '' ? '   ' : `{${variableName}}`,
    x: paddingX + labelTextWidth.value + labelValueSepGap + labelValueSepWidth + labelValueSepGap,
    y: paddingY,
    lineHeight,
    fill: uiVariables.color.blue.main
  }
})

watch(valueTextConfig, () => nextTick().then(updateValueTextWidth))

function toPosition(node: Shape | Stage) {
  const x = round(node.x() - props.viewportSize.width / 2)
  const y = round(props.viewportSize.height / 2 - node.y())
  return { x, y }
}

function toSize(node: Shape | Stage) {
  const size = round(node.scaleX(), 2)
  return size
}
/** Handler for position-change (drag) or transform */
function handleChange(e: KonvaEventObject<unknown>, action: Action) {
  const { monitor } = props
  const { x, y } = toPosition(e.target)
  const size = toSize(e.target)
  editorCtx.project.history.doAction(action, () => {
    monitor.setX(x)
    monitor.setY(y)
    monitor.setSize(size)
  })
}

function handleClick() {
  editorCtx.state.selectWidget(props.monitor.id)
}
</script>
