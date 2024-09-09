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
import { ref, watch, shallowRef } from 'vue'
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
    if (
      expanded === 'sprites' &&
      project.selected?.type !== 'sprite' &&
      project.sprites.length > 0
    ) {
      project.select({
        type: 'sprite',
        id: lastSelectedSpriteId.value ?? project.sprites[0].id
      })
    } else if (
      expanded === 'sounds' &&
      project.selected?.type !== 'sound' &&
      project.sounds.length > 0
    ) {
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

.main {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
}

.sider {
  flex: 0 0 auto;
}
</style>
