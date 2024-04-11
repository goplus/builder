<template>
  <UIPanel class="stage-editor">
    <SpxCodeEditor :value="stage.code" @change="(v) => stage.setCode(v)" />
  </UIPanel>
</template>

<script setup lang="ts">
import { UIPanel } from '@/components/ui'
import type { Stage } from '@/models/stage'
import SpxCodeEditor from '../spx-code-editor/SpxCodeEditor.vue'

defineProps<{
  stage: Stage
}>()
</script>

<style scoped></style>
