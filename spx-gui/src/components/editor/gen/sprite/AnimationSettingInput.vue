<script lang="ts" setup>
import PromptInput from '../common/PromptInput.vue'
import type { AnimationGen } from '@/models/gen/animation-gen'

defineProps<{
  animationGen: AnimationGen
}>()
</script>

<template>
  <PromptInput
    :value="animationGen.input"
    :enrich-loading="animationGen.enrichState.state === 'running'"
    :generate-loading="animationGen.generateVideoState.state === 'running'"
    @update:value="animationGen.setInput($event)"
    @enrich="animationGen.enrich()"
    @generate="animationGen.generateVideo()"
  >
    <template #param-selector>
      <div>123</div>
    </template>
  </PromptInput>
</template>

<style lang="scss" scoped></style>
