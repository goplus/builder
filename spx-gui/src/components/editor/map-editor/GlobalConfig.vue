<script setup lang="ts">
import { useEditorCtx } from '../EditorContextProvider.vue'
import MapEditor from './MapEditor.vue'

const editorCtx = useEditorCtx()

function handleSpriteSelect(spriteId: string | null) {
  if (spriteId == null) return
  editorCtx.state.selectSprite(spriteId)
}
</script>

<template>
  <MapEditor
    :project="editorCtx.project"
    :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null"
    @update:selected-sprite-id="handleSpriteSelect"
  />
</template>

<style lang="scss" scoped></style>
