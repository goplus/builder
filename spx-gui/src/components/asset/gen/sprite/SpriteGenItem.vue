<script lang="ts" setup>
import { UIBlockItemTitle } from '@/components/ui'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { computed } from 'vue'
import GenItem from '../common/GenItem.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const isLoading = computed(() => {
  const { costumes, animations } = props.gen
  return [
    ...costumes.flatMap((costume) => [costume.enrichState.status, costume.generateState.status]),
    ...animations.flatMap((animation) => [
      animation.enrichState.status,
      animation.generateVideoState.status,
      animation.extractFramesState.status
    ]),
    props.gen.contentPreparingState.status,
    props.gen.imagesGenState.status,
    props.gen.enrichState.status
  ].includes('running')
})
const ready = computed(() => props.gen.contentPreparingState.status === 'finished')
</script>

<template>
  <GenItem :loading="isLoading" :ready="ready" type="sprite">
    <UIBlockItemTitle size="medium">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>

<style lang="scss" scoped></style>
