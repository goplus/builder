<script lang="ts" setup>
import { computed } from 'vue'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { UIBlockItemTitle, UIImg } from '@/components/ui'
import GenItem from '../common/GenItem.vue'
import spriteSVG from '../common/sprite.svg?raw'
import { isCostumesLoading } from '../costume/CostumeGenItem.vue'
import { isAnimationsLoading } from '../animation/AnimationGenItem.vue'

const props = defineProps<{
  gen: SpriteGen
}>()

const [imageUrl, imageLoading] = useRenderableImageUrl(() => props.gen.image)

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
  >
    <template v-if="gen.image != null" #preview>
      <UIImg class="h-full w-full" :src="imageUrl" :loading="imageLoading" />
    </template>
    <UIBlockItemTitle size="medium" :title="gen.settings.name">{{ gen.settings.name }}</UIBlockItemTitle>
  </GenItem>
</template>
