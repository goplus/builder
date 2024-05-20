<template>
  <section class="stage-panel" :class="{ active }" :style="cssVars">
    <!-- TODO: use UICardHeader? -->
    <h4 class="header">{{ $t({ en: 'Stage', zh: '舞台' }) }}</h4>
    <main class="main">
      <div class="overview" :class="{ active }" @click="activate">
        <UIImg class="img" :src="imgSrc" size="cover" :loading="imgLoading" />
      </div>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, getCssVars, useUIVariables } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { useEditorCtx } from '../../EditorContextProvider.vue'

const editorCtx = useEditorCtx()

const active = computed(() => editorCtx.selected?.type === 'stage')

function activate() {
  editorCtx.select('stage')
}

const backdrop = computed(() => editorCtx.project.stage.defaultBackdrop)
const [imgSrc, imgLoading] = useFileUrl(() => backdrop.value?.img)

const uiVariables = useUIVariables()
const cssVars = getCssVars('--panel-color-', uiVariables.color.stage)
</script>

<style scoped lang="scss">
.header {
  height: 44px;
  width: 80px;
  display: flex;
  justify-content: center;
  align-items: center;

  font-size: 16px;
  color: var(--ui-color-title);
  border-bottom: 1px solid var(--ui-color-grey-400);
}

.stage-panel.active {
  .header {
    color: var(--ui-color-grey-100);
    background-color: var(--ui-color-stage-main);
    border-color: var(--ui-color-stage-main);
  }
}

.main {
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.overview {
  width: 100%;
  padding: 2px;
  position: relative;
  border-radius: var(--ui-border-radius-1);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &:not(.active):hover {
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    padding: 0;
    background-color: var(--ui-color-grey-400);
    border: 2px solid var(--ui-color-stage-main);
  }
}

.img {
  width: 100%;
  height: 40px;
  border-radius: 4px;
}
</style>
