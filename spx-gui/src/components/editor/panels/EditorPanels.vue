<template>
  <div class="editor-panels">
    <div class="main">
      <div
        :class="activePanel === 'sprites' ? 'main-panel-active' : 'main-panel-inactive'"
        @click="activate('sprites')"
      >
        <SpritesPanel :active="activePanel === 'sprites'"></SpritesPanel>
      </div>
      <div
        :class="activePanel === 'sounds' ? 'main-panel-active' : 'main-panel-inactive'"
        @click="activate('sounds')"
      >
        <SoundsPanel :active="activePanel === 'sounds'"></SoundsPanel>
      </div>
    </div>
    <StagePanel class="sider"></StagePanel>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEditorCtx } from '@/components/editor/ProjectEditor.vue'
import SoundsPanel from './sound/SoundsPanel.vue'
import SpritesPanel from './sprite/SpritesPanel.vue'
import StagePanel from './stage/StagePanel.vue'

const activePanel = ref<'sprites' | 'sounds'>('sprites')
function activate(panel: 'sprites' | 'sounds') {
  activePanel.value = panel
}

const editorCtx = useEditorCtx()
watch(
  () => editorCtx.selected,
  (selected) => {
    if (selected?.type === 'sprite' && activePanel.value !== 'sprites') activate('sprites')
    if (selected?.type === 'sound' && activePanel.value !== 'sounds') activate('sounds')
  }
)
</script>

<style scoped lang="scss">
.editor-panels {
  margin: 10px;
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
}

.main {
  flex: 1 1 0;
  display: flex;
  background-color: darkgray;
}

.main-panel-active,
.main-panel-inactive {
  transition: 0.3s;
  border: 1px solid #333;
}

.main-panel-active {
  flex: 1 1 0;
}
.main-panel-inactive {
  flex: 0 0 auto;
}

.sider {
  flex: 0 0 auto;
  margin-left: 10px;
}
</style>
