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
import { watchEffect, ref, watch, shallowRef } from 'vue'
import { UICard } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import type { Sound } from '@/models/sound'
import type { Sprite } from '@/models/sprite'
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
    else if (selected?.type === 'sound' && expandedPanel.value !== 'sounds') expand('sounds')
  }
)

const lastSelectedSprite = shallowRef<Sprite | null>(null)
watchEffect(() => {
  if (editorCtx.selectedSprite != null) {
    lastSelectedSprite.value = editorCtx.selectedSprite
  }
})
watchEffect(() => {
  // lastSelectedSprite removed from project
  // TODO: a simple & reliable way to listen to sprite-removing is required
  if (
    lastSelectedSprite.value != null &&
    !editorCtx.project.sprites.includes(lastSelectedSprite.value)
  ) {
    lastSelectedSprite.value = null
  }
})

const lastSelectedSound = shallowRef<Sound | null>(null)
watchEffect(() => {
  if (editorCtx.selectedSound != null) {
    lastSelectedSound.value = editorCtx.selectedSound
  }
})
watchEffect(() => {
  // lastSelectedSound removed from project
  if (
    lastSelectedSound.value != null &&
    !editorCtx.project.sounds.includes(lastSelectedSound.value)
  ) {
    lastSelectedSound.value = null
  }
})

watch(
  () => expandedPanel.value,
  (expanded) => {
    if (
      expanded === 'sprites' &&
      editorCtx.selected?.type !== 'sprite' &&
      editorCtx.project.sprites.length > 0
    ) {
      editorCtx.select(
        'sprite',
        lastSelectedSprite.value?.name ?? editorCtx.project.sprites[0].name
      )
    } else if (
      expanded === 'sounds' &&
      editorCtx.selected?.type !== 'sound' &&
      editorCtx.project.sounds.length > 0
    ) {
      editorCtx.select('sound', lastSelectedSound.value?.name ?? editorCtx.project.sounds[0].name)
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
