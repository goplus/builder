<script lang="ts" setup>
import PromptInput from '../common/PromptInput.vue'
import type { CostumeGen } from '@/models/gen/costume-gen'

defineProps<{
  costumeGen: CostumeGen
}>()
</script>

<template>
  <PromptInput
    :value="costumeGen.input"
    :enrich-loading="costumeGen.enrichState.state === 'running'"
    :generate-loading="costumeGen.generateState.state === 'running'"
    @update:value="costumeGen.setInput($event)"
    @enrich="costumeGen.enrich()"
    @generate="costumeGen.generate()"
  >
    <template #param-selector>
      <div>123</div>
    </template>
  </PromptInput>
</template>

<style lang="scss" scoped></style>
