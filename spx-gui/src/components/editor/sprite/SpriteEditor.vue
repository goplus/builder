<template>
  <SpxCodeEditor :value="sprite.code" @change="(v) => sprite.setCode(v)" />
</template>

<script setup lang="ts">
import type { Sprite } from '@/models/sprite'
import SpxCodeEditor from '../spx-code-editor/SpxCodeEditor.vue'

defineProps<{
  sprite: Sprite
}>()
</script>
