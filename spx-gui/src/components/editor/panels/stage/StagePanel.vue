<template>
  <section class="stage-panel" :class="{ active }" :style="cssVars">
    <!-- TODO: use UICardHeader? -->
    <h4 class="header">{{ $t({ en: 'Stage', zh: '舞台' }) }}</h4>
    <main class="main">
      <div class="stages">
        <div
          v-radar="{ name: 'Stage overview', desc: 'Overview of the stage, click to view stage details' }"
          class="overview"
          :class="{ active }"
          @click="activate"
        >
          <UIImg class="img" :src="imgSrc" size="cover" :loading="imgLoading" />
        </div>
      </div>
      <UIDivider />
      <div class="quick-actions">
        <button
          v-radar="{
            name: 'Backdrops quick entry',
            desc: 'Quick entry to open backdrops management tab in stage editor'
          }"
          class="quick-btn"
          type="button"
          @click="openTab('backdrops')"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="icon" v-html="backdropSvg"></span>
          <span>{{ $t({ en: 'Backdrops', zh: '背景' }) }}</span>
        </button>
        <button
          v-radar="{ name: 'Sounds quick entry', desc: 'Quick entry to open sounds management tab in stage editor' }"
          class="quick-btn"
          type="button"
          @click="openTab('sounds')"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="icon" v-html="soundSvg"></span>
          <span>{{ $t({ en: 'Sounds', zh: '声音' }) }}</span>
        </button>
        <button
          v-radar="{ name: 'Widgets quick entry', desc: 'Quick entry to open widgets management tab in stage editor' }"
          class="quick-btn"
          type="button"
          @click="openTab('widgets')"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="icon" v-html="widgetSvg"></span>
          <span>{{ $t({ en: 'Widgets', zh: '控件' }) }}</span>
        </button>
      </div>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, getCssVars, useUIVariables, UIDivider } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import type { SelectedType } from '../../stage/StageEditor.vue'
import widgetSvg from './widget.svg?raw'
import soundSvg from './sound.svg?raw'
import backdropSvg from './backdrop.svg?raw'

const editorCtx = useEditorCtx()

const active = computed(() => editorCtx.state.selected?.type === 'stage')

function activate() {
  editorCtx.state.select({ type: 'stage' })
}

function openTab(type: Extract<SelectedType, 'backdrops' | 'sounds' | 'widgets'>) {
  editorCtx.state.select({ type: 'stage' })
  editorCtx.state.stageState.select(type)
}

const backdrop = computed(() => editorCtx.project.stage.defaultBackdrop)
const [imgSrc, imgLoading] = useFileUrl(() => backdrop.value?.img)

const uiVariables = useUIVariables()
const cssVars = getCssVars('--panel-color-', uiVariables.color.stage)
</script>

<style scoped lang="scss">
.stage-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .header {
    flex: 0 0 44px;
    width: 80px;
    display: flex;
    justify-content: center;
    align-items: center;

    font-size: 16px;
    color: var(--ui-color-title);
    border-bottom: 1px solid var(--ui-color-grey-400);
  }

  &.active {
    .header {
      color: var(--ui-color-grey-100);
      background-color: var(--ui-color-stage-main);
      border-color: var(--ui-color-stage-main);
    }
  }

  .main {
    flex: 1 1 0;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
}

.overview {
  width: 56px;
  height: 56px;
  padding: 2px;
  position: relative;
  border-radius: var(--ui-border-radius-1);
  background-color: var(--ui-color-grey-300);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:not(.active):hover {
    background-color: var(--ui-color-grey-400);
  }

  &.active {
    padding: 0;
    background-color: var(--ui-color-blue-200);
    border: 2px solid var(--ui-color-stage-main);
  }

  .img {
    width: 44px;
    height: 44px;
    border-radius: 4px;
    object-fit: cover;
  }
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .quick-btn {
    width: 56px;
    height: 56px;
    border-radius: var(--ui-border-radius-1);
    background-color: var(--ui-color-grey-300);
    border: none;
    outline: none;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--ui-color-grey-1000);
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
    cursor: pointer;

    &:hover {
      background-color: var(--ui-color-grey-400);
    }

    .icon {
      width: 24px;
      height: 24px;
    }
  }
}
</style>
