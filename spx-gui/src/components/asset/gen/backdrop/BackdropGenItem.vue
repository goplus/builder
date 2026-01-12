<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItemTitle } from '@/components/ui'
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import GenItem from '../common/GenItem.vue'
import backdropSVG from '../common/backdrop.svg?raw'

const props = defineProps<{
  gen: BackdropGen
}>()

const isLoading = computed(() => [props.gen.enrichState.status, props.gen.imagesGenState.status].includes('running'))
const highlight = computed(() => props.gen.imagesGenState.status === 'finished')
</script>

<template>
  <GenItem
    :main="{
      color: 'stage',
      loading: {
        headColor: 'var(--ui-color-stage-main)',
        tailColor: '#D6EDFF',
        traceColor: '#F3FCFD1A',
        backgroundColor: 'var(--ui-color-stage-main)'
      },
      highlightColor: 'var(--ui-color-stage-main)'
    }"
    :loading="isLoading"
    :highlight="highlight"
    :placeholder="backdropSVG"
  >
    <UIBlockItemTitle size="large">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>

<style lang="scss" scoped></style>
