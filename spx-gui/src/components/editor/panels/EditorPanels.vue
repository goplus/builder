<template>
  <div
    v-show="running.mode !== 'debug'"
    class="flex gap-xl"
    :class="layout === 'portrait' ? 'h-full w-64 flex-none flex-col' : 'flex-[1_1_0]'"
  >
    <UICard
      v-radar="{ name: 'Sprites panel', desc: 'Panel containing sprites for the project' }"
      class="min-w-0 flex"
      :class="layout === 'portrait' ? 'min-h-0 flex-[3_1_0]' : 'flex-[1_1_0]'"
    >
      <SpritesPanel />
    </UICard>
    <UICard
      v-radar="{
        name: 'Stage panel',
        desc: 'Panel for stage of the project, with quick entries to widgets, sounds and backdrops tabs'
      }"
      :class="layout === 'portrait' ? 'h-47.5 flex-none' : 'flex-none'"
    >
      <StagePanel :layout="layout === 'portrait' ? 'wide' : 'compact'" />
    </UICard>
  </div>
  <ConsolePanel
    v-show="running.mode === 'debug'"
    v-radar="{
      name: 'Console panel',
      desc: 'Console panel showing runtime output and errors',
      visible: running.mode === 'debug'
    }"
    :class="layout === 'portrait' ? 'h-full w-64 flex-none' : 'flex-[1_1_0]'"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UICard } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import SpritesPanel from './sprite/SpritesPanel.vue'
import StagePanel from './stage/StagePanel.vue'
import ConsolePanel from './ConsolePanel.vue'

withDefaults(
  defineProps<{
    layout?: 'default' | 'portrait'
  }>(),
  { layout: 'default' }
)

const editorCtx = useEditorCtx()
const running = computed(() => editorCtx.state.runtime.running)
</script>
