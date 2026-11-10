<script setup lang="ts">
import type { Animation } from '@/models/spx/animation'
import { provideLocalEditorCtx, type EditorCtx } from '../EditorContextProvider.vue'
import AnimationSettings from './animation/AnimationSettings.vue'

const props = defineProps<{
  animation: Animation
  context: EditorCtx
}>()
provideLocalEditorCtx(props.context)
</script>

<template>
  <AnimationSettings :animation="animation" sound-editable />
</template>
