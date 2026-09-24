<template>
  <UICard
    v-if="layout === 'portrait'"
    v-radar="{
      name: 'Stage panel',
      desc: 'Panel for stage of the project, with quick entries to widgets, sounds and backdrops tabs'
    }"
    class="min-h-30 flex-[1_1_0]"
  >
    <StagePanel layout="wide" />
  </UICard>
  <div v-else class="flex flex-[1_1_0] gap-xl">
    <UICard
      v-radar="{ name: 'Sprites panel', desc: 'Panel containing sprites for the project' }"
      class="min-w-0 flex flex-[1_1_0]"
    >
      <SpritesPanel />
    </UICard>
    <UICard
      v-radar="{
        name: 'Stage panel',
        desc: 'Panel for stage of the project, with quick entries to widgets, sounds and backdrops tabs'
      }"
      class="flex-none"
    >
      <StagePanel />
    </UICard>
  </div>
</template>

<script setup lang="ts">
import { UICard } from '@/components/ui'
import SpritesPanel from './sprite/SpritesPanel.vue'
import StagePanel from './stage/StagePanel.vue'

withDefaults(
  defineProps<{
    layout?: 'landscape' | 'portrait'
  }>(),
  { layout: 'landscape' }
)
</script>
