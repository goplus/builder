<template>
  <v-transformer
    ref="transformer"
    :config="{
      keepRatio: true,
      shouldOverdrawWholeArea: true,
      rotateAnchorCursor: 'grab',
      centeredScaling: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      flipEnabled: false
    }"
  />
</template>

<script setup lang="ts">
import { effect, nextTick, ref } from 'vue'
import type { Transformer } from 'konva/lib/shapes/Transformer'
import type { Node } from 'konva/lib/Node'
import { useEditorCtx } from '../../EditorContextProvider.vue'

const props = defineProps<{
  spritesReadyMap: Map<string, boolean>
}>()

const transformer = ref<any>()
const editorCtx = useEditorCtx()

effect(async () => {
  if (transformer.value == null) return
  const transformerNode: Transformer = transformer.value.getNode()
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
