<template>
  <div v-show="running.mode !== 'debug'" class="editor-panels">
    <UICard class="main">
      <SpritesPanel :expanded="expandedPanel === 'sprites'" @expand="expand('sprites')" />
      <SoundsPanel :expanded="expandedPanel === 'sounds'" @expand="expand('sounds')" />
    </UICard>
    <UICard class="sider">
      <StagePanel></StagePanel>
    </UICard>
  </div>
  <ConsolePanel v-show="running.mode === 'debug'" class="console-panel" />
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { UICard } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SoundsPanel from './sound/SoundsPanel.vue'
import SpritesPanel from './sprite/SpritesPanel.vue'
import StagePanel from './stage/StagePanel.vue'
import ConsolePanel from './ConsolePanel.vue'

const expandedPanel = ref<'sprites' | 'sounds'>('sprites')
function expand(panel: 'sprites' | 'sounds') {
  expandedPanel.value = panel
}

const editorCtx = useEditorCtx()
const running = computed(() => editorCtx.state.runtime.running)

watch(
  () => editorCtx.state.selected,
  (selected) => {
    if (selected?.type === 'sprite' && expandedPanel.value !== 'sprites') expand('sprites')
    else if (selected?.type === 'sound' && expandedPanel.value !== 'sounds') expand('sounds')
  },
  { immediate: true }
)

watch(
  () => expandedPanel.value,
  (expanded) => {
    const { project, state } = editorCtx
    if (expanded === 'sprites' && state.selected?.type !== 'sprite' && project.sprites.length > 0) {
      state.select({ type: 'sprite' })
    } else if (expanded === 'sounds' && state.selected?.type !== 'sound' && project.sounds.length > 0) {
      state.select({ type: 'sound' })
    }
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

.console-panel {
  flex: 1 1 0;
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
