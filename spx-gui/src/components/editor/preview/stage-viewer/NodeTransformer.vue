<template>
  <v-custom-transformer ref="transformer" :config="config" />
</template>

<script setup lang="ts">
import { computed, effect, nextTick, ref } from 'vue'
import type { Node } from 'konva/lib/Node'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import type { CustomTransformer, CustomTransformerConfig } from './custom-transformer'
import { getNodeId } from './node'

const props = defineProps<{
  nodeReadyMap: Map<string, boolean>
}>()

const transformer = ref<KonvaNodeInstance<CustomTransformer>>()
const editorCtx = useEditorCtx()

const config = computed<CustomTransformerConfig>(() => {
  const project = editorCtx.project
  if (project.selectedSprite != null) {
    return {
      rotationStyle: project.selectedSprite.rotationStyle,
      centeredScaling: true
    }
  }
  return {
    rotationStyle: 'none',
    centeredScaling: false
  }
})

effect(async () => {
  if (transformer.value == null) return
  const transformerNode = transformer.value.getNode()
  transformerNode.nodes([])
  const project = editorCtx.project
  const selected = project.selectedSprite ?? project.stage.selectedWidget
  if (selected == null) return
  const nodeId = getNodeId(selected)
  // Wait for node ready, so that Konva can get correct node size
  if (!props.nodeReadyMap.get(nodeId)) return
  const stage = transformerNode.getStage()
  if (stage == null) throw new Error('no stage')
  const selectedNode = stage.findOne((node: Node) => node.getAttr('nodeId') === nodeId)
  if (selectedNode == null || selectedNode === (transformerNode as any).node()) return
  await nextTick() // Wait to ensure the selected node updated by Konva
  transformerNode.nodes([selectedNode])
})

defineExpose({
  withHidden<T>(callback: () => T): T {
    transformer.value?.getNode().hide()
    const ret = callback()
    transformer.value?.getNode().show()
    return ret
  }
})
</script>
