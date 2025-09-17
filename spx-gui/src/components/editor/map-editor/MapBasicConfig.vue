<!--
MapBasicConfig provide editing form for basic map config, including
* size
* physics
-->

<script setup lang="ts">
import type { Project } from '@/models/project'

import MapSizeInput from './MapSizeInput.vue'
import MapPhysicsInput from './MapPhysicsInput.vue'

defineProps<{
  project: Project
}>()
</script>

<template>
  <div class="map-basic-config">
    <MapSizeInput :project="project" />
    <MapPhysicsInput :project="project" />
  </div>
</template>

<style lang="scss" scoped>
.map-basic-config {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
  padding: 16px;
}
</style>
