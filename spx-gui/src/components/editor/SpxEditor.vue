<template>
  <SoundHome v-if="editorCtx.selected?.type === 'sound'" />
  <SpxEditorHome v-else />
</template>

<script setup lang="ts">
import SpxEditorHome from './spx-code-editor/CodeEditorHome.vue'
import SoundHome from './sound/SoundHome.vue'
import { useEditorCtx } from './ProjectEditor.vue'

const editorCtx = useEditorCtx()
</script>
