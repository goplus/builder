<template>
  <v-group v-if="pivotMarkerGroupConfig != null" :config="pivotMarkerGroupConfig">
    <PivotMarker primary-color="#CBD2D8" :opacity="0.9" />
  </v-group>
  <v-custom-transformer ref="transformer" :config="config" />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watchEffect } from 'vue'
import { debounce } from 'lodash'
import type Konva from 'konva'
import type { Node } from 'konva/lib/Node'
import type { GroupConfig } from 'konva/lib/Group'
import { Sprite } from '@/models/spx/sprite'
import type { Widget } from '@/models/spx/widget'
import type { CustomTransformer, CustomTransformerConfig } from './custom-transformer'
import PivotMarker from '../PivotMarker.vue'
import { getNodeId } from './common'

const props = defineProps<{
  target: Sprite | Widget | null
  nodeReadyMap: Map<string, boolean>
}>()

const emit = defineEmits<{
  selectedNode: [node: Node]
}>()

const transformer = ref<KonvaNodeInstance<CustomTransformer>>()
const pivotMarkerPos = ref<{ x: number; y: number } | null>(null)

const config = computed<CustomTransformerConfig>(() => {
  if (props.target instanceof Sprite) {
    return {
      rotationStyle: props.target.rotationStyle,
      centeredScaling: true
    }
  }
  return {
    rotationStyle: 'none',
    centeredScaling: false
  }
})

const pivotMarkerGroupConfig = computed<GroupConfig | null>(() => {
  if (!(props.target instanceof Sprite) || pivotMarkerPos.value == null) return null
  return {
    x: pivotMarkerPos.value.x,
    y: pivotMarkerPos.value.y,
    listening: false
  }
})

const keyboardMovementCodes = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']
const keyboardMovementOffset = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0]
]

function setupKeyboardMovement(stage: Konva.Stage, selectedNode: Node) {
  stage.container().tabIndex = 1
  stage.container().focus()
  stage.container().style.outline = 'none'
  const keyboardMovementEnd = debounce(() => selectedNode.fire('dragend'), 500)
  const handler = (e: KeyboardEvent) => {
    const idx = keyboardMovementCodes.indexOf(e.code)
    if (idx === -1) return
    selectedNode.x(selectedNode.x() + keyboardMovementOffset[idx][0])
    selectedNode.y(selectedNode.y() + keyboardMovementOffset[idx][1])
    selectedNode.fire('dragmove')
    e.preventDefault()
    keyboardMovementEnd()
  }
  stage.container().addEventListener('keydown', handler)
  return () => {
    keyboardMovementEnd.cancel()
    stage.container().removeEventListener('keydown', handler)
  }
}

// The selected sprite node lives in the map/content layer, while the pivot marker is rendered
// alongside the transformer in an overlay layer. Convert the sprite's absolute position back
// into the overlay layer's local coordinates before placing the marker.
function updatePivotMarkerPos(node: Node) {
  const pos = node.getAbsolutePosition()
  const overlayLayer = transformer.value?.getNode().getParent()
  if (overlayLayer == null) {
    pivotMarkerPos.value = { x: pos.x, y: pos.y }
    return
  }
  const overlayLocalPos = overlayLayer.getAbsoluteTransform().copy().invert().point(pos)
  pivotMarkerPos.value = {
    x: overlayLocalPos.x,
    y: overlayLocalPos.y
  }
}

// Re-sample the selected node once per frame while it stays selected. This is simpler than
// wiring every possible Konva transform/parent change event, and keeps the overlay marker in
// sync with sprite moves, map pan/zoom, and pivot-related node updates.
function setupPivotMarkerSync(selectedNode: Node) {
  if (!(props.target instanceof Sprite)) {
    pivotMarkerPos.value = null
    return () => {}
  }

  let stopped = false
  let rafId: number | null = null

  const sync = () => {
    updatePivotMarkerPos(selectedNode)
    if (stopped) return
    rafId = requestAnimationFrame(sync)
  }

  sync()

  return () => {
    stopped = true
    if (rafId != null) cancelAnimationFrame(rafId)
  }
}

watchEffect(async (onCleanup) => {
  if (transformer.value == null) return
  const transformerNode = transformer.value.getNode()
  transformerNode.nodes([])
  pivotMarkerPos.value = null
  if (props.target == null) return
  const nodeId = getNodeId(props.target)
  // Wait for node ready, so that Konva can get correct node size
  if (!props.nodeReadyMap.get(nodeId)) return
  const stage = transformerNode.getStage()
  if (stage == null) throw new Error('no stage')
  const selectedNode = stage.findOne((node: Node) => node.getAttr('nodeId') === nodeId)
  if (selectedNode == null || selectedNode === (transformerNode as any).node()) return
  await nextTick() // Wait to ensure the selected node updated by Konva
  transformerNode.nodes([selectedNode])
  emit('selectedNode', selectedNode)

  onCleanup(setupKeyboardMovement(stage, selectedNode))
  onCleanup(setupPivotMarkerSync(selectedNode))
})

defineExpose({
  getNode() {
    return transformer.value?.getNode()
  },
  withHidden<T>(callback: () => T): T {
    transformer.value?.getNode().hide()
    const ret = callback()
    transformer.value?.getNode().show()
    return ret
  }
})
</script>
