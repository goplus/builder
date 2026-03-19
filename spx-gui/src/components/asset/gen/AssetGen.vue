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
  enableLibrarySearch?: boolean
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
    :enable-library-search="enableLibrarySearch"
    @collapse="$emit('collapse')"
    @finished="$emit('finished')"
    @asset-picked="$emit('assetPicked', $event)"
  />
  <BackdropGenComp
    v-else-if="gen instanceof BackdropGen"
    :gen="gen"
    :description-placeholder="descriptionPlaceholder"
    :enable-library-search="enableLibrarySearch"
    @finished="$emit('finished')"
    @asset-picked="$emit('assetPicked', $event)"
  />
</template>
