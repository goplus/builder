<script setup lang="ts">
import type { AssetGenModel } from '@/models/spx/common/asset'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'
import SpriteGenComp from './sprite/SpriteGen.vue'
import BackdropGenComp from './backdrop/BackdropGen.vue'

defineProps<{
  gen: AssetGenModel
  descriptionPlaceholder?: string
}>()

defineEmits<{
  collapse: []
  finished: []
}>()
</script>

<template>
  <SpriteGenComp
    v-if="gen instanceof SpriteGen"
    :gen="gen"
    :description-placeholder="descriptionPlaceholder"
    @collapse="$emit('collapse')"
    @finished="$emit('finished')"
  />
  <BackdropGenComp
    v-else-if="gen instanceof BackdropGen"
    :gen="gen"
    :description-placeholder="descriptionPlaceholder"
    @finished="$emit('finished')"
  />
</template>
