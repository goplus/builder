<!--
MapBasicConfig provide editing form for basic map config, including
* size
* physics
-->

<script setup lang="ts">
import type { Project } from '@/models/project'

defineProps<{
  project: Project
}>()
</script>

<template>
  <div style="height: 200px">Basic Config for map</div>
</template>

<style lang="scss" scoped></style>
