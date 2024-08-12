<template>
  <v-custom-transformer ref="transformer" :config="config" />
</template>

<script setup lang="ts">
import { computed, effect, nextTick, ref } from 'vue'
import type { Node } from 'konva/lib/Node'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import type { CustomTransformer, CustomTransformerConfig } from './custom-transformer'

const props = defineProps<{
  spritesReadyMap: Map<string, boolean>
}>()

const transformer = ref<any>()
const editorCtx = useEditorCtx()

const config = computed<CustomTransformerConfig>(() => {
  const sprite = editorCtx.project.selectedSprite
  return {
    rotationStyle: sprite?.rotationStyle,
    centeredScaling: true
  }
})

effect(async () => {
  if (transformer.value == null) return
  const transformerNode: CustomTransformer = transformer.value.getNode()
  transformerNode.nodes([])
  const sprite = editorCtx.project.selectedSprite
  if (sprite == null) return
  // Wait for sprite ready, so that Konva can get correct node size
  if (!props.spritesReadyMap.get(sprite.name)) return
  const stage = transformerNode.getStage()
  if (stage == null) throw new Error('no stage')
  const selectedNode = stage.findOne((node: Node) => node.getAttr('spriteName') === sprite.name)
  if (selectedNode == null || selectedNode === (transformerNode as any).node()) return
  await nextTick() // Wait to ensure the selected node updated by Konva
  transformerNode.nodes([selectedNode])
})
</script>
