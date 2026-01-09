<script lang="ts">
export function isAnimationLoading(gen: AnimationGen) {
  return [gen.enrichState.status, gen.generateVideoState.status, gen.extractFramesState.status].includes('running')
}

export function isAnimationsLoading(gens: AnimationGen[]) {
  return gens.some((gen) => isAnimationLoading(gen))
}
</script>

<script lang="ts" setup>
import { computed, ref } from 'vue'

import { UIBlockItemTitle, UIImg } from '@/components/ui'
import type { AnimationGen } from '@/models/gen/animation-gen'
import CornerMenu from '@/components/editor/common/CornerMenu.vue'
import RenameMenuItem from '@/components/editor/common/corner-menu-item/RenameMenuItem.vue'
import RemoveMenuItem from '@/components/editor/common/corner-menu-item/RemoveMenuItem.vue'
import GenItem from '../common/GenItem.vue'
import CostumesAutoPlayer from '@/components/common/CostumesAutoPlayer.vue'
import { useHovered } from '@/utils/dom'
import { useFileUrl } from '@/utils/file'
import animationSVG from '../common/animation.svg?raw'

const props = defineProps<{
  gen: AnimationGen
  active: boolean
}>()

const emit = defineEmits<{
  click: []
  rename: []
  remove: []
}>()

const wrapperRef = ref<InstanceType<typeof GenItem>>()

const [imgSrc, imgLoading] = useFileUrl(() => props.gen.result?.costumes[0].img)
const hovered = useHovered(() => wrapperRef.value?.$el ?? null)

const isLoading = computed(() => isAnimationLoading(props.gen) || imgLoading.value)
const pending = computed(() => props.gen.generateVideoState.status === 'finished')
</script>

<template>
  <GenItem
    ref="wrapperRef"
    :gen-color="{
      color: 'primary',
      loading: {
        headColor: 'var(--ui-color-primary-main)',
        tailColor: '#DCF7FA',
        traceColor: '#F3FCFD1A',
        backgroundColor: 'var(--ui-color-primary-main)'
      },
      pending: {
        highlightColor: 'var(--ui-color-primary-main)'
      }
    }"
    :placeholder="animationSVG"
    :loading="isLoading"
    :pending="pending"
    :active="active"
    @click="emit('click')"
  >
    <template v-if="gen.result !== null" #preview>
      <CostumesAutoPlayer
        v-if="hovered"
        class="preview"
        :costumes="gen.result.costumes"
        :duration="gen.result.duration"
        :placeholder-img="imgSrc"
      />
      <UIImg v-else class="preview" :src="imgSrc" :loading="imgLoading" />
    </template>
    <UIBlockItemTitle size="large">{{ gen.name }}</UIBlockItemTitle>
    <CornerMenu v-if="active" color="primary">
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the animation' }" @click="emit('rename')" />
      <RemoveMenuItem v-radar="{ name: 'Remove', desc: 'Click to remove the animation' }" @click="emit('remove')" />
    </CornerMenu>
  </GenItem>
</template>

<style lang="scss" scoped>
.preview {
  width: 100%;
  height: 100%;
}
</style>
