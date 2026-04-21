<template>
  <div v-show="running.mode !== 'debug'" class="flex-[1_1_0] flex gap-xl">
    <UICard
      v-radar="{ name: 'Sprites panel', desc: 'Panel containing sprites for the project' }"
      class="flex-[1_1_0] min-w-0 flex"
    >
      <SpritesPanel />
    </UICard>
    <UICard
      v-radar="{
        name: 'Stage panel',
        desc: 'Panel for stage of the project, with quick entries to widgets, sounds and backdrops tabs'
      }"
      class="flex-none"
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
    class="flex-[1_1_0]"
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
