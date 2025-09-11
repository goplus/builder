<!--
SpriteList
* list all sprites of the project
* sprite selection / unselection supported
-->

<script setup lang="ts">
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'

defineProps<{
  project: Project
  selectedSprite: Sprite | null
}>()

const emit = defineEmits<{
  'update:selectedSprite': [sprite: Sprite | null]
}>()
</script>

<template>
  <div>
    Sprite list
    <ul>
      <li
        v-for="sprite in project.sprites"
        :key="sprite.id"
        :style="{ color: sprite.id === selectedSprite?.id ? 'red' : 'inherit' }"
        @click="emit('update:selectedSprite', sprite.id === selectedSprite?.id ? null : sprite)"
      >
        {{ sprite.name }}
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped></style>
