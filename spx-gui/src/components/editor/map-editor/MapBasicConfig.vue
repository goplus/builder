<script setup lang="ts">
import type { Project } from '@/models/project'

import MapSizeInput from './MapSizeInput.vue'
import MapPhysicsInput from './MapPhysicsInput.vue'
import MapLayerSortInput from './MapLayerSortInput.vue'

defineProps<{
  project: Project
}>()
</script>

<template>
  <div class="map-basic-config">
    <div class="config-item">
      <div class="label">{{ $t({ en: 'Map size', zh: '地图尺寸' }) }}</div>
      <MapSizeInput :project="project" />
    </div>
    <div class="config-item">
      <div class="label">{{ $t({ en: 'Physics', zh: '物理特性' }) }}</div>
      <MapPhysicsInput :project="project" />
    </div>
    <div v-if="project.stage.physics.enabled" class="config-item">
      <div class="label">{{ $t({ en: 'Layer Sorting', zh: '层级排序' }) }}</div>
      <MapLayerSortInput :project="project" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.map-basic-config {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}

.config-item {
  display: flex;
  align-items: center;

  .label {
    white-space: nowrap;
    margin-right: 16px;
  }
}
</style>
