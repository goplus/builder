<script lang="ts" setup>
import { computed } from 'vue'
import { UIBlockItemTitle } from '@/components/ui'
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import GenItem from '../common/GenItem.vue'

const props = defineProps<{
  gen: BackdropGen
}>()

const isLoading = computed(() => [props.gen.enrichState.status, props.gen.generateState.status].includes('running'))
const ready = computed(() => props.gen.generateState.status === 'finished')
</script>

<template>
  <GenItem type="backdrop" :loading="isLoading" :ready="ready">
    <UIBlockItemTitle size="large">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>

<style lang="scss" scoped></style>
