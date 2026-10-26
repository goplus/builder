<script setup lang="ts">
import type { SpriteGen, SpriteGenResult } from '@/models/spx/gen/sprite-gen'
import SpriteGenPhaseSettings from './SpriteGenPhaseSettings.vue'
import SpriteGenPhaseContent from './SpriteGenPhaseContent.vue'

defineProps<{
  gen: SpriteGen
  descriptionPlaceholder?: string
  librarySearchEnabled?: boolean
}>()

const emit = defineEmits<{
  collapse: []
  resolved: [SpriteGenResult]
}>()
</script>

<template>
  <SpriteGenPhaseSettings
    v-if="gen.isPreparePhase"
    :gen="gen"
    :description-placeholder="descriptionPlaceholder"
    :library-search-enabled="librarySearchEnabled"
    @resolved="emit('resolved', $event)"
  />
  <SpriteGenPhaseContent v-else :gen="gen" @collapse="emit('collapse')" @resolved="emit('resolved', $event)" />
</template>
