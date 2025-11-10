<script setup lang="ts">
import { useEditorCtx } from '../EditorContextProvider.vue'
import MapEditor from './MapEditor.vue'

const editorCtx = useEditorCtx()
</script>

<template>
  <MapEditor :project="editorCtx.project" :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null" />
</template>

<style lang="scss" scoped></style>
