<script lang="ts" setup>
import { computed } from 'vue'
import type { CostumeGen } from '@/models/gen/costume-gen'
import GenLoading from '../common/GenLoading.vue'

const props = defineProps<{
  gen: CostumeGen
}>()

const loading = computed(() => props.gen.generateState.status === 'running')
</script>

<template>
  <div class="costume-gen-preview">
    <GenLoading :visible="loading || true"> TODO: costume gen </GenLoading>
  </div>
</template>

<style lang="scss" scoped>
.costume-gen-preview {
  position: absolute;
  inset: 0;
}
</style>
