<template>
  <v-group :config="groupConfig" @dragend="handleDragEnd" @transformend="handleTransformed" @click="handleClick">
    <v-rect :config="rectConfig" />
    <v-text ref="labelTextRef" :config="labelTextConfig" />
    <v-rect :config="valueRectConfig" />
    <v-text ref="valueTextRef" :config="valueTextConfig" />
  </v-group>
</template>
<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TextConfig, Text } from 'konva/lib/shapes/Text'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { GroupConfig } from 'konva/lib/Group'
import type { Action } from '@/models/project'
import type { Size } from '@/models/common'
import { round } from '@/utils/utils'
import type { Monitor } from '@/models/widget/monitor'
import { useUIVariables } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { getNodeId } from '../common'

const props = defineProps<{
  monitor: Monitor
  viewportSize: Size
  nodeReadyMap: Map<string, boolean>
}>()

const uiVariables = useUIVariables()
const editorCtx = useEditorCtx()

const nodeId = computed(() => getNodeId(props.monitor))
const labelTextRef = ref<KonvaNodeInstance<Text>>()
const valueTextRef = ref<KonvaNodeInstance<Text>>()
const labelTextWidth = ref(0)
const valueTextWidth = ref(0)

async function updateTextWidth() {
  if (labelTextRef.value == null || valueTextRef.value == null) return
  labelTextWidth.value = labelTextRef.value.getNode().getWidth()
  valueTextWidth.value = valueTextRef.value.getNode().getWidth()

  // text change triggers node-size change, we need to trigger transformer update manually.
  // It's a Transformer bug that it doesn't update correctly when attached node size changed causing by text content change
  props.nodeReadyMap.set(nodeId.value, false)
  await nextTick()
  props.nodeReadyMap.set(nodeId.value, true)
}

watch(
  () => props.monitor,
  () => nextTick().then(updateTextWidth),
  { deep: true }
)

onMounted(() => {
  updateTextWidth()

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

const paddingX = [6, 2] as const // px
const paddingY = 5 // px
const valuePaddingX = 8 // px
const valuePaddingY = 3 // px
const fontSize = 12 // px
const lineHeight = 1.5 // ratio
const labelValueGap = 4 // px

const valueWidth = computed(() => valueTextWidth.value + valuePaddingX * 2)

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
  const width = paddingX[0] + labelTextWidth.value + labelValueGap + valueWidth.value + paddingX[1]
  const height = fontSize * lineHeight + paddingY * 2
  return {
    width,
    height,
    fill: uiVariables.color.grey[100],
    cornerRadius: height / 2
  }
})

const labelTextConfig = computed<TextConfig>(() => {
  const { label } = props.monitor
  return {
    text: label,
    x: paddingX[0],
    y: paddingY,
    lineHeight,
    fill: uiVariables.color.grey[1000]
  }
})

const valueRectConfig = computed<RectConfig>(() => {
  const height = fontSize * lineHeight + valuePaddingY * 2
  return {
    x: paddingX[0] + labelTextWidth.value + labelValueGap,
    y: paddingY - valuePaddingY,
    width: valueWidth.value,
    height,
    fill: uiVariables.color.blue.main,
    cornerRadius: height / 2
  }
})

const valueTextConfig = computed<TextConfig>(() => {
  const { variableName } = props.monitor
  return {
    text: variableName === '' ? '   ' : `{${variableName}}`,
    x: paddingX[0] + labelTextWidth.value + labelValueGap + valuePaddingX,
    y: paddingY,
    lineHeight,
    fill: uiVariables.color.grey[100]
  }
})

/** Handler for position-change (drag) or transform */
function handleChange(e: KonvaEventObject<unknown>, action: Action) {
  const { monitor, viewportSize: mapSize } = props
  const x = round(e.target.x() - mapSize.width / 2)
  const y = round(mapSize.height / 2 - e.target.y())
  const size = round(e.target.scaleX(), 2)
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
