<script lang="ts" setup>
import { UIBlockItemTitle } from '@/components/ui'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import { computed } from 'vue'
import GenItem from '../common/GenItem.vue'
import littleGuySVG from '../common/little-guy.svg?raw'
import { isCostumesLoading } from '../costume/CostumeGenItem.vue'
import { isAnimationsLoading } from '../animation/AnimationGenItem.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const isLoading = computed(() => {
  const { costumes, animations } = props.gen
  return isCostumesLoading(costumes) ||
    isAnimationsLoading(animations) ||
    [props.gen.contentPreparingState.status, props.gen.imagesGenState.status, props.gen.enrichState.status].includes(
      'running'
    )
    ? {
        colorStop1: 'var(--ui-color-sprite-main)',
        colorStop2: '#FFF0DC',
        colorStop3: '#FFFAF51A',
        genLoadingBgColor: 'var(--ui-color-sprite-main)'
      }
    : false
})
const pending = computed(() =>
  props.gen.contentPreparingState.status === 'finished' ? 'var(--ui-color-sprite-main)' : false
)
</script>

<template>
  <GenItem :loading="isLoading" :placeholder="littleGuySVG" :pending="pending" color="sprite">
    <UIBlockItemTitle size="medium">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>

<style lang="scss" scoped></style>
