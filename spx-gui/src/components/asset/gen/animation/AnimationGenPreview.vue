<script lang="ts" setup>
import { computed } from 'vue'
import type { AnimationGen } from '@/models/gen/animation-gen'
import GenLoading from '../common/GenLoading.vue'

const props = defineProps<{
  gen: AnimationGen
}>()

const loading = computed(
  () => props.gen.generateVideoState.status === 'running' || props.gen.extractFramesState.status === 'running'
)
</script>

<template>
  <div class="animation-gen-preview">
    <GenLoading :visible="loading || true"> TODO: animation gen </GenLoading>
  </div>
</template>

<style lang="scss" scoped>
.animation-gen-preview {
  position: absolute;
  inset: 0;
}
</style>
