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
  return (
    isCostumesLoading(costumes) ||
    isAnimationsLoading(animations) ||
    [props.gen.contentPreparingState.status, props.gen.imagesGenState.status, props.gen.enrichState.status].includes(
      'running'
    )
  )
})
const pending = computed(() => props.gen.contentPreparingState.status === 'finished')
</script>

<template>
  <GenItem
    :loading="isLoading"
    :placeholder="littleGuySVG"
    :pending="pending"
    :gen-color="{
      color: 'sprite',
      loading: {
        headColor: 'var(--ui-color-sprite-main)',
        tailColor: '#FFF0DC',
        traceColor: '#FFFAF51A',
        backgroundColor: 'var(--ui-color-sprite-main)'
      },
      pending: {
        highlightColor: 'var(--ui-color-sprite-main)'
      }
    }"
  >
    <UIBlockItemTitle size="medium">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>

<style lang="scss" scoped></style>
