<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItemTitle } from '@/components/ui'
import type { BackdropGen } from '@/models/spx/gen/backdrop-gen'
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
    v-radar="{
      name: `Backdrop generation item '${gen.settings.name}'`,
      desc: `Click to view generation settings and preview for backdrop '${gen.settings.name}'`
    }"
    :color="{
      main: 'stage',
      loading: {
        headColor: 'var(--ui-color-stage-main)',
        tailColor: '#D6EDFF',
        traceColor: '#F3FCFD1A',
        activeTraceColor: '#82C9FE'
      },
      highlightColor: 'var(--ui-color-stage-main)'
    }"
    :loading="isLoading"
    :highlight="highlight"
    :placeholder="backdropSVG"
  >
    <UIBlockItemTitle size="medium">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>

<style lang="scss" scoped></style>
