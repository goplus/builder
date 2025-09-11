<!--
SpriteBasicConfig provide editing form for basic sprite properties, including
* position
* size
* rotation
* visibility
* physics
-->

<script setup lang="ts">
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'

defineProps<{
  sprite: Sprite
  project: Project
}>()
</script>

<template>
  <div style="height: 200px">Basic Config for {{ sprite.name }}</div>
</template>

<style lang="scss" scoped></style>
