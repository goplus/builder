<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import type { Project } from '@/data/mock'
import UIButton from '@/components/ui/UIButton.vue'

const props = defineProps<{
  project: Project
  showControls?: boolean
}>()

const state = ref<'initial' | 'loading' | 'running'>('initial')
let runTimer: ReturnType<typeof window.setTimeout> | null = null

const loading = computed(() => state.value === 'loading')
const running = computed(() => state.value === 'running')

async function run() {
  if (state.value === 'loading' || state.value === 'running') return
  state.value = 'loading'
  await new Promise<void>((resolve) => {
    runTimer = window.setTimeout(() => {
      runTimer = null
      state.value = 'running'
      resolve()
    }, 700)
  })
}

function stop() {
  if (runTimer != null) {
    window.clearTimeout(runTimer)
    runTimer = null
  }
  state.value = 'initial'
}

function rerun() {
  state.value = 'running'
}

defineExpose({
  run,
  stop,
  rerun
})

onBeforeUnmount(() => {
  if (runTimer != null) window.clearTimeout(runTimer)
})
</script>

<template>
  <div class="relative size-full overflow-hidden rounded-lg bg-grey-1000">
    <img class="size-full object-cover" :src="project.thumbnail" :alt="project.title" />

    <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,41,47,0)_0%,rgba(36,41,47,0.2)_100%)]"></div>

    <div class="absolute inset-0 flex items-center justify-center p-6">
      <UIButton v-if="!running" type="primary" :loading="loading" @click="run">Run</UIButton>
      <div v-else class="rounded-md bg-grey-100/90 px-4 py-2 text-sm font-medium text-title shadow-sm">
        Prototype preview
      </div>
    </div>

    <div v-if="running && props.showControls !== false" class="absolute top-3 right-3 flex gap-2">
      <button class="rounded-md bg-grey-100 px-3 py-1.5 text-sm text-title shadow-sm" type="button" @click="rerun">Rerun</button>
      <button class="rounded-md bg-grey-100 px-3 py-1.5 text-sm text-title shadow-sm" type="button" @click="stop">Stop</button>
    </div>
  </div>
</template>
