<template>
  <v-transformer ref="transformer" :config="{ keepRatio: true, shouldOverdrawWholeArea: true }" />
</template>

<script setup lang="ts">
import { effect, ref } from 'vue'
import type { Transformer } from 'konva/lib/shapes/Transformer'
import type { Node } from 'konva/lib/Node'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import type { Sprite } from '@/models/sprite'

const props = defineProps<{
  spritesReady: (sprite: Sprite) => boolean
}>()

const transformer = ref<any>()
const editorCtx = useEditorCtx()

effect(async () => {
  if (transformer.value == null) return
  const transformerNode: Transformer = transformer.value.getNode()
  transformerNode.nodes([])
  const sprite = editorCtx.selectedSprite
  if (sprite == null) return
  // Wait for sprite ready, so that Konva can get correct node size
  if (!props.spritesReady(sprite)) return
  const stage = transformerNode.getStage()
  if (stage == null) throw new Error('no stage')
  const selectedNode = stage.findOne((node: Node) => node.getAttr('spriteName') === sprite.name)
  if (selectedNode == null || selectedNode === (transformerNode as any).node()) return
  transformerNode.nodes([selectedNode])
})
</script>
