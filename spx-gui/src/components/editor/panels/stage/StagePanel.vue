<template>
  <section class="flex h-full flex-col overflow-hidden" :style="cssVars">
    <!-- TODO: use UICardHeader? -->
    <h4
      class="flex h-11 w-20 items-center justify-center border-b border-grey-400 text-16"
      :class="active ? 'border-stage-main bg-stage-main text-grey-100' : 'text-title'"
    >
      {{ $t({ en: 'Stage', zh: '舞台' }) }}
    </h4>
    <main class="flex flex-[1_1_0] flex-col items-center">
      <div class="flex-[0_0_auto] p-3">
        <div
          v-radar="{ name: 'Stage overview', desc: 'Overview of the stage, click to view stage details' }"
          class="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-1 bg-grey-300"
          :class="active ? 'border-2 border-stage-main bg-blue-200 p-0' : 'p-0.5 hover:bg-grey-400'"
          @click="activate"
        >
          <UIImg class="h-11 w-11 rounded-[4px] object-cover" :src="imgSrc" size="cover" :loading="imgLoading" />
        </div>
      </div>
      <UIDivider class="w-10" />
      <div class="scroll-container w-full flex-[1_0_72px] overflow-y-auto">
        <div class="flex flex-col items-start gap-2">
          <button
            v-radar="{
              name: 'Backdrops quick entry',
              desc: 'Quick entry to open backdrops management tab in stage editor'
            }"
            class="flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-1 border-none bg-grey-300 p-2 text-10/4 font-semibold text-grey-1000 outline-none hover:bg-grey-400"
            type="button"
            @click="openTab('backdrops')"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="h-6 w-6" v-html="backdropSvg"></span>
            <span>{{ $t({ en: 'Backdrops', zh: '背景' }) }}</span>
          </button>
          <button
            v-radar="{ name: 'Sounds quick entry', desc: 'Quick entry to open sounds management tab in stage editor' }"
            class="flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-1 border-none bg-grey-300 p-2 text-10/4 font-semibold text-grey-1000 outline-none hover:bg-grey-400"
            type="button"
            @click="openTab('sounds')"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="h-6 w-6" v-html="soundSvg"></span>
            <span>{{ $t({ en: 'Sounds', zh: '声音' }) }}</span>
          </button>
          <button
            v-radar="{
              name: 'Widgets quick entry',
              desc: 'Quick entry to open widgets management tab in stage editor'
            }"
            class="flex h-14 w-14 cursor-pointer flex-col items-center justify-center rounded-1 border-none bg-grey-300 p-2 text-10/4 font-semibold text-grey-1000 outline-none hover:bg-grey-400"
            type="button"
            @click="openTab('widgets')"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="h-6 w-6" v-html="widgetSvg"></span>
            <span>{{ $t({ en: 'Widgets', zh: '控件' }) }}</span>
          </button>
        </div>
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

<style scoped>
.scroll-container {
  padding: 12px 0 12px 12px; /* no right padding to allow optional scrollbar */
  scrollbar-width: thin;
}
</style>
