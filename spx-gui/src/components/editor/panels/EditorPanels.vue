<template>
  <div class="editor-panels">
    <UICard class="main">
      <SpritesPanel :expanded="expandedPanel === 'sprites'" @expand="expand('sprites')" />
      <SoundsPanel :expanded="expandedPanel === 'sounds'" @expand="expand('sounds')" />
    </UICard>
    <UICard class="sider">
      <StagePanel></StagePanel>
    </UICard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { UICard } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SoundsPanel from './sound/SoundsPanel.vue'
import SpritesPanel from './sprite/SpritesPanel.vue'
import StagePanel from './stage/StagePanel.vue'

const expandedPanel = ref<'sprites' | 'sounds'>('sprites')
function expand(panel: 'sprites' | 'sounds') {
  expandedPanel.value = panel
}

const editorCtx = useEditorCtx()
watch(
  () => editorCtx.selected,
  (selected) => {
    if (selected?.type === 'sprite' && expandedPanel.value !== 'sprites') expand('sprites')
    if (selected?.type === 'sound' && expandedPanel.value !== 'sounds') expand('sounds')
  }
)
</script>

<style scoped lang="scss">
.editor-panels {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  gap: var(--ui-gap-middle);
}

.main {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
}

.sider {
  flex: 0 0 auto;
}
</style>
