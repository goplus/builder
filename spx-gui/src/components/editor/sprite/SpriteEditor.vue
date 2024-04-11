<template>
  <UIPanel class="sprite-editor">
    <SpxCodeEditor :value="sprite.code" @change="(v) => sprite.setCode(v)" />
  </UIPanel>
</template>

<script setup lang="ts">
import { UIPanel } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import SpxCodeEditor from '../spx-code-editor/SpxCodeEditor.vue'

defineProps<{
  sprite: Sprite
}>()
</script>

<style scoped></style>
