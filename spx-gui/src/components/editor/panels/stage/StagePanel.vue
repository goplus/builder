<template>
  <section class="h-full flex flex-col overflow-hidden">
    <UICardHeader class="h-11" :class="layout === 'wide' ? 'w-full justify-start px-3' : 'w-20 justify-center'">
      {{ $t({ en: 'Stage', zh: '舞台' }) }}
    </UICardHeader>
    <main class="min-h-0 flex-[1_1_0] flex flex-col" :class="layout === 'wide' ? 'items-stretch' : 'items-center'">
      <div class="flex-none" :class="layout === 'wide' ? 'px-3 py-2' : 'p-3'">
        <div
          v-radar="{ name: 'Stage overview', desc: 'Overview of the stage, click to view stage details' }"
          class="relative h-14 w-14 cursor-pointer flex items-center justify-center rounded-md border border-grey-400 transition-colors"
          :class="active ? 'p-0 border-2 border-primary-main bg-primary-200' : 'p-0.5 hover:bg-grey-300'"
          @click="activate"
        >
          <UIImg class="h-11 w-11 rounded-[4px] object-cover" :src="imgSrc" size="cover" :loading="imgLoading" />
        </div>
      </div>
      <UIDivider :class="layout === 'wide' ? 'mx-3 w-auto' : 'w-10'" />
      <div class="w-full flex-[1_0_72px] overflow-y-auto" :class="layout === 'wide' ? '' : 'scroll-container'">
        <div :class="layout === 'wide' ? 'grid grid-cols-3 gap-2 px-3 py-2' : 'flex flex-col items-start gap-2'">
          <button
            v-radar="{
              name: 'Backdrops quick entry',
              desc: 'Quick entry to open backdrops management tab in stage editor'
            }"
            :class="quickEntryClass"
            type="button"
            @click="openTab('backdrops')"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="h-7.5 w-7.5 flex items-center justify-center" v-html="backdropSvg"></span>
            <span>{{ $t({ en: 'Backdrops', zh: '背景' }) }}</span>
          </button>
          <button
            v-radar="{ name: 'Sounds quick entry', desc: 'Quick entry to open sounds management tab in stage editor' }"
            :class="quickEntryClass"
            type="button"
            @click="openTab('sounds')"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="h-7.5 w-7.5 flex items-center justify-center" v-html="soundSvg"></span>
            <span>{{ $t({ en: 'Sounds', zh: '声音' }) }}</span>
          </button>
          <button
            v-radar="{
              name: 'Widgets quick entry',
              desc: 'Quick entry to open widgets management tab in stage editor'
            }"
            :class="quickEntryClass"
            type="button"
            @click="openTab('widgets')"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="h-7.5 w-7.5 flex items-center justify-center" v-html="widgetSvg"></span>
            <span>{{ $t({ en: 'Widgets', zh: '控件' }) }}</span>
          </button>
        </div>
      </div>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIImg, UIDivider, UICardHeader } from '@/components/ui'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import type { SelectedType } from '../../stage/StageEditor.vue'
import widgetSvg from './widget.svg?raw'
import soundSvg from './sound.svg?raw'
import backdropSvg from './backdrop.svg?raw'

const editorCtx = useEditorCtx()

const props = withDefaults(
  defineProps<{
    layout?: 'compact' | 'wide'
  }>(),
  { layout: 'compact' }
)

const layout = computed(() => props.layout)

const active = computed(() => editorCtx.state.selected?.type === 'stage')

function activate() {
  editorCtx.state.select({ type: 'stage' })
}

function openTab(type: Extract<SelectedType, 'backdrops' | 'sounds' | 'widgets'>) {
  editorCtx.state.select({ type: 'stage' })
  editorCtx.state.stageState.select(type)
}

const backdrop = computed(() => editorCtx.project.stage.defaultBackdrop)
const [imgSrc, imgLoading] = useRenderableImageUrl(() => backdrop.value?.img)

const quickEntryClass = computed(
  () => `h-14 cursor-pointer flex flex-col items-center justify-center gap-0.5 \
rounded-md border-none bg-grey-100 p-1 text-2xs text-grey-900 outline-none \
transition-colors hover:bg-grey-300 ${layout.value === 'wide' ? 'w-full' : 'w-14'}`
)
</script>

<style scoped>
.scroll-container {
  padding: 12px 0 12px 12px; /* no right padding to allow optional scrollbar */
  scrollbar-width: thin;
}
</style>
