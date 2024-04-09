<template>
  <SoundEditor v-if="editorCtx.selected?.type === 'sound'" />
  <SpriteEditor v-else-if="editorCtx.selectedSprite != null" :sprite="editorCtx.selectedSprite" />
  <StageEditor v-else-if="editorCtx.selected?.type === 'stage'" :stage="editorCtx.project.stage" />
  <div v-else>TODO</div>
</template>

<script setup lang="ts">
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import { useEditorCtx } from './ProjectEditor.vue'

const editorCtx = useEditorCtx()
</script>
