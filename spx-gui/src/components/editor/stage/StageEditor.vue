<template>
  <SpxCodeEditor :value="stage.code" @change="(v) => stage.setCode(v)" />
</template>

<script setup lang="ts">
import type { Stage } from '@/models/stage'
import SpxCodeEditor from '../spx-code-editor/SpxCodeEditor.vue'

defineProps<{
  stage: Stage
}>()
</script>
