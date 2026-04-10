<script lang="ts" setup>
import { UIBlockItemTitle } from '@/components/ui'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { computed } from 'vue'
import GenItem from '../common/GenItem.vue'
import spriteSVG from '../common/sprite.svg?raw'
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
const highlight = computed(() => props.gen.contentPreparingState.status === 'finished')
</script>

<template>
  <GenItem
    v-radar="{
      name: `Sprite generation item '${gen.settings.name}'`,
      desc: `Click to view generation phase details for sprite '${gen.settings.name}'`
    }"
    :loading="isLoading"
    :highlight="highlight"
    :placeholder="spriteSVG"
    :color="{
      main: 'sprite',
      loading: {
        headColor: 'var(--ui-color-sprite-main)',
        tailColor: '#FFF0DC',
        traceColor: '#FFFAF51A',
        activeTraceColor: '#FDCC8E'
      },
      highlightColor: 'var(--ui-color-sprite-main)'
    }"
  >
    <UIBlockItemTitle size="medium">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>
