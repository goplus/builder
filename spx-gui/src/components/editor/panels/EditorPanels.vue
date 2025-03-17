<template>
  <div v-show="running.mode !== 'debug'" class="editor-panels">
    <TagNode name="main-panel">
      <UICard class="main">
        <TagNode name="sprites-panel">
          <SpritesPanel :expanded="expandedPanel === 'sprites'" @expand="expand('sprites')" />
        </TagNode>
        <TagNode name="sounds-panel">
          <SoundsPanel :expanded="expandedPanel === 'sounds'" @expand="expand('sounds')" />
        </TagNode>
      </UICard>
    </TagNode>
    <TagNode name="sider-panel">
      <UICard class="sider">
        <TagNode name="stage-panel">
          <StagePanel></StagePanel>
        </TagNode>
      </UICard>
    </TagNode>
  </div>
  <TagNode name="console-panel">
    <ConsolePanel v-show="running.mode === 'debug'" class="console-panel" />
  </TagNode>
</template>

<script setup lang="ts">
import { ref, watch, shallowRef, computed } from 'vue'
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
const running = computed(() => editorCtx.runtime.running)

watch(
  () => editorCtx.project.selected,
  (selected) => {
    if (selected?.type === 'sprite' && expandedPanel.value !== 'sprites') expand('sprites')
    else if (selected?.type === 'sound' && expandedPanel.value !== 'sounds') expand('sounds')
  },
  { immediate: true }
)

const lastSelectedSpriteId = shallowRef<string | null>(null)
const lastSelectedSoundId = shallowRef<string | null>(null)
watch(
  () => [editorCtx.project, editorCtx.project.selected] as const,
  ([project], [lastProject, lastSelected]) => {
    if (project !== lastProject) {
      lastSelectedSpriteId.value = null
      lastSelectedSoundId.value = null
      return
    }
    if (lastSelected?.type === 'sprite') lastSelectedSpriteId.value = lastSelected.id
    else if (lastSelected?.type === 'sound') lastSelectedSoundId.value = lastSelected.id
  }
)

watch(
  () => expandedPanel.value,
  (expanded) => {
    const project = editorCtx.project
    if (expanded === 'sprites' && project.selected?.type !== 'sprite' && project.sprites.length > 0) {
      project.select({
        type: 'sprite',
        id: lastSelectedSpriteId.value ?? project.sprites[0].id
      })
    } else if (expanded === 'sounds' && project.selected?.type !== 'sound' && project.sounds.length > 0) {
      project.select({
        type: 'sound',
        id: lastSelectedSoundId.value ?? editorCtx.project.sounds[0].id
      })
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
