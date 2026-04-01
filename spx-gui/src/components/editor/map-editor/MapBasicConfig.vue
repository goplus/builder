<script setup lang="ts">
import type { SpxProject } from '@/models/spx/project'

import MapSizeInput from './MapSizeInput.vue'
import MapPhysicsInput from './MapPhysicsInput.vue'
import MapLayerSortInput from './MapLayerSortInput.vue'

defineProps<{
  project: SpxProject
}>()
</script>

<template>
  <div class="flex flex-col gap-middle">
    <div class="flex items-center">
      <div class="mr-middle whitespace-nowrap">{{ $t({ en: 'Map size', zh: '地图尺寸' }) }}</div>
      <MapSizeInput :project="project" />
    </div>
    <div class="flex items-center">
      <div class="mr-middle whitespace-nowrap">{{ $t({ en: 'Physics', zh: '物理特性' }) }}</div>
      <MapPhysicsInput :project="project" />
    </div>
    <div v-if="project.stage.physics.enabled" class="flex items-center">
      <div class="mr-middle whitespace-nowrap">{{ $t({ en: 'Layer Sorting', zh: '层级排序' }) }}</div>
      <MapLayerSortInput :project="project" />
    </div>
  </div>
</template>
