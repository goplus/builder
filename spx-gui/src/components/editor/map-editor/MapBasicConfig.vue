<!--
MapBasicConfig provide editing form for basic map config, including
* size
* physics
-->

<script setup lang="ts">
import type { Project } from '@/models/project'

import MapSize from '@/components/editor/common/config/stage/MapSize.vue'
import MapPhysics from '@/components/editor/common/config/stage/MapPhysics.vue'

defineProps<{
  project: Project
}>()
</script>

<template>
  <div class="map-basic-config">
    <MapSize :project="project" />
    <MapPhysics :project="project" />
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
