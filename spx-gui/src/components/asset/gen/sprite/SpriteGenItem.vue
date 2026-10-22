<script lang="ts" setup>
import { UIBlockItemTitle } from '@/components/ui'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { computed } from 'vue'
import GenItem from '../common/GenItem.vue'
import spriteSVG from '../common/sprite.svg?raw'
import { isCostumesLoading } from '../costume/CostumeGenItem.vue'
import { isAnimationsLoading } from '../animation/AnimationGenItem.vue'

const props = withDefaults(
  defineProps<{
    gen: SpriteGen
    active?: boolean
  }>(),
  { active: false }
)

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
const failed = computed(() =>
  [
    props.gen.contentPreparingState,
    props.gen.imagesGenState,
    props.gen.enrichState,
    ...props.gen.costumes.flatMap((gen) => [gen.enrichState, gen.generateState, gen.finishState]),
    ...props.gen.animations.flatMap((gen) => [gen.enrichState, gen.generateVideoState, gen.finishState])
  ].some((state) => state.status === 'failed')
)
</script>

<template>
  <GenItem
    v-radar="{
      name: `Sprite generation item '${gen.settings.name}'`,
      desc: `Click to view generation phase details for sprite '${gen.settings.name}'`
    }"
    :active="active"
    :loading="isLoading"
    :highlight="highlight"
    :failed="failed"
    ai
    :placeholder="spriteSVG"
  >
    <UIBlockItemTitle size="medium" :title="gen.settings.name">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>
