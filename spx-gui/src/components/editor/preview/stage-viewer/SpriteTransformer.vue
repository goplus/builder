<template>
  <v-transformer ref="transformer" :config="{ keepRatio: true, shouldOverdrawWholeArea: true }" />
</template>

<script setup lang="ts">
import { effect, ref } from 'vue'
import type { Transformer } from 'konva/lib/shapes/Transformer'
import type { Node } from 'konva/lib/Node'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { useSpritesReady } from './common'

const transformer = ref<any>()
const editorCtx = useEditorCtx()
const spritesReady = useSpritesReady()

effect(async () => {
  if (transformer.value == null) return
  const transformerNode: Transformer = transformer.value.getNode()
  const sprite = editorCtx.selectedSprite
  if (sprite == null) {
    transformerNode.nodes([])
    return
  }
  // Wait for sprite ready, so that Konva can get correct node size
  if (!spritesReady.get(sprite.name)) return
  const stage = transformerNode.getStage()
  if (stage == null) throw new Error('no stage')
  const selectedNode = stage.findOne((node: Node) => node.getAttr('spriteName') === sprite.name)
  if (selectedNode == null || selectedNode === (transformerNode as any).node()) return
  transformerNode.nodes([selectedNode])
})
</script>
