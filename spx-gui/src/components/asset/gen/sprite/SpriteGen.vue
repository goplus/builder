<script setup lang="ts">
import type { SpriteGen } from '@/models/gen/sprite-gen'
import type { Sprite } from '@/models/sprite'
import SpriteGenPhaseSettings from './SpriteGenPhaseSettings.vue'
import SpriteGenPhaseContent from './SpriteGenPhaseContent.vue'

defineProps<{
  gen: SpriteGen
}>()

const emit = defineEmits<{
  collapse: []
  finished: [Sprite]
}>()
</script>

<template>
  <SpriteGenPhaseContent
    v-if="gen.contentPreparingState.status === 'finished'"
    :gen="gen"
    @collapse="emit('collapse')"
    @finished="emit('finished', $event)"
  />
  <SpriteGenPhaseSettings v-else :gen="gen" />
</template>

<style lang="scss" scoped></style>
