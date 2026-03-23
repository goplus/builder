<template>
  <div v-show="running.mode !== 'debug'" class="editor-panels">
    <UICard v-radar="{ name: 'Sprites panel', desc: 'Panel containing sprites for the project' }" class="main">
      <SpritesPanel />
    </UICard>
    <UICard
      v-radar="{
        name: 'Stage panel',
        desc: 'Panel for stage of the project, with quick entries to widgets, sounds and backdrops tabs'
      }"
      class="sider"
    >
      <StagePanel />
    </UICard>
  </div>
  <ConsolePanel
    v-show="running.mode === 'debug'"
    v-radar="{
      name: 'Console panel',
      desc: 'Console panel showing runtime output and errors',
      visible: running.mode === 'debug'
    }"
    class="console-panel"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UICard } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SpritesPanel from './sprite/SpritesPanel.vue'
import StagePanel from './stage/StagePanel.vue'
import ConsolePanel from './ConsolePanel.vue'

const editorCtx = useEditorCtx()
const running = computed(() => editorCtx.state.runtime.running)
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
