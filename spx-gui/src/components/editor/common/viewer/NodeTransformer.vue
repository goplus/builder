<template>
  <v-custom-transformer ref="transformer" :config="config" />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watchEffect } from 'vue'
import type { Node } from 'konva/lib/Node'
import { Sprite } from '@/models/sprite'
import type { Widget } from '@/models/widget'
import type { CustomTransformer, CustomTransformerConfig } from './custom-transformer'
import { getNodeId } from './common'
import { debounce } from 'lodash'
import type Konva from 'konva'

const props = defineProps<{
  target: Sprite | Widget | null
  nodeReadyMap: Map<string, boolean>
}>()

const transformer = ref<KonvaNodeInstance<CustomTransformer>>()

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

watchEffect(async (onCleanup) => {
  if (transformer.value == null) return
  const transformerNode = transformer.value.getNode()
  transformerNode.nodes([])
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

  onCleanup(setupKeyboardMovement(stage, selectedNode))
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
