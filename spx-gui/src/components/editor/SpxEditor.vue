<template>
  <SoundEditor v-if="editorCtx.selected?.type === 'sound'" />
  <SpriteEditor v-if="editorCtx.selectedSprite != null" :sprite="editorCtx.selectedSprite" />
  <div v-else>TODO</div>
</template>

<script setup lang="ts">
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import { useEditorCtx } from './ProjectEditor.vue'

const editorCtx = useEditorCtx()
</script>
