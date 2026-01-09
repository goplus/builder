<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItemTitle } from '@/components/ui'
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import GenItem from '../common/GenItem.vue'
import backdropSVG from '../common/backdrop.svg?raw'

const props = defineProps<{
  gen: BackdropGen
}>()

const isLoading = computed(() =>
  [props.gen.enrichState.status, props.gen.imagesGenState.status].includes('running')
    ? {
        colorStop1: 'var(--ui-color-stage-main)',
        colorStop2: '#D6EDFF',
        colorStop3: '#F3FCFD1A',
        genLoadingBgColor: 'var(--ui-color-stage-main)'
      }
    : false
)
const pending = computed(() => (props.gen.imagesGenState.status === 'finished' ? 'var(--ui-color-stage-main)' : false))
</script>

<template>
  <GenItem color="stage" :loading="isLoading" :pending="pending" :placeholder="backdropSVG">
    <UIBlockItemTitle size="large">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>

<style lang="scss" scoped></style>
