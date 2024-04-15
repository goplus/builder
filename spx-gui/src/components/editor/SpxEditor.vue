<template>
  <UICard class="container">
    <UICardHeader> TODO: Tab Placeholder</UICardHeader>
    <SoundEditor v-if="editorCtx.selected?.type === 'sound'" />
    <SpriteEditor v-else-if="editorCtx.selectedSprite != null" :sprite="editorCtx.selectedSprite" />
    <StageEditor
      v-else-if="editorCtx.selected?.type === 'stage'"
      :stage="editorCtx.project.stage"
    />
    <div v-else>TODO</div>
  </UICard>
</template>

<script setup lang="ts">
import { UICard, UICardHeader } from '@/components/ui'
import { useEditorCtx } from './EditorContextProvider.vue'
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'

const editorCtx = useEditorCtx()
</script>

<style scoped lang="scss">
.container {
  flex: 1;
}
</style>
