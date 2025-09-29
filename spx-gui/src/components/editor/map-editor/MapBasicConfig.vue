<script setup lang="ts">
import type { Project } from '@/models/project'

import MapConfig from '../common/config/MapConfig.vue'
import MapSizeInput from './MapSizeInput.vue'
import MapPhysicsInput from './MapPhysicsInput.vue'
import MapLayerSortInput from './MapLayerSortInput.vue'

defineProps<{
  project: Project
}>()
</script>

<template>
  <MapConfig class="map-basic-config">
    <MapSizeInput :project="project" />
    <MapPhysicsInput :project="project" />
    <MapLayerSortInput v-if="project.stage.physics.enabled" :project="project" />
  </MapConfig>
</template>

<style lang="scss" scoped>
.map-basic-config {
  width: 100%;
}
</style>
