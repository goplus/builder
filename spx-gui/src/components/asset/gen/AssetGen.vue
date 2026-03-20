<script setup lang="ts">
import type { AssetData } from '@/apis/asset'
import type { AssetGenModel } from '@/models/spx/common/asset'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'
import SpriteGenComp from './sprite/SpriteGen.vue'
import BackdropGenComp from './backdrop/BackdropGen.vue'

defineProps<{
  gen: AssetGenModel
  descriptionPlaceholder?: string
  librarySearchEnabled?: boolean
}>()

defineEmits<{
  collapse: []
  finished: []
  assetPicked: [AssetData]
}>()
</script>

<template>
  <SpriteGenComp
    v-if="gen instanceof SpriteGen"
    :gen="gen"
    :description-placeholder="descriptionPlaceholder"
    :library-search-enabled="librarySearchEnabled"
    @collapse="$emit('collapse')"
    @finished="$emit('finished')"
    @asset-picked="$emit('assetPicked', $event)"
  />
  <!-- BackdropGen has a single-phase flow, so collapse is not needed -->
  <BackdropGenComp
    v-else-if="gen instanceof BackdropGen"
    :gen="gen"
    :description-placeholder="descriptionPlaceholder"
    :library-search-enabled="librarySearchEnabled"
    @finished="$emit('finished')"
    @asset-picked="$emit('assetPicked', $event)"
  />
</template>
