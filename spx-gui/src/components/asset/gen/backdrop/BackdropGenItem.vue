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
    :loading="isLoading"
    :highlight="highlight"
    :placeholder="backdropSVG"
  >
    <UIBlockItemTitle size="medium">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>
