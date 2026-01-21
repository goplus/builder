<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import type { File } from '@/models/common/file'
import { UIImg } from '@/components/ui'
import { useImageSelectorCompact, useImageSelectorDisabled } from '../common/ImageSelector.vue'
import GenLoading from '../common/GenLoading.vue'

const props = withDefaults(
  defineProps<{
    file?: File | null
    active?: boolean
    loading?: boolean
  }>(),
  {
    file: null,
    active: false,
    loading: false
  }
)

const disabled = useImageSelectorDisabled()
const compact = useImageSelectorCompact()
const [url, fileLoading] = useFileUrl(() => props.file)
const loading = computed(() => props.loading || fileLoading.value)
</script>

<template>
  <div
    v-radar="{
      name: 'Backdrop image item',
      desc: 'Click to select this image as the backdrop'
    }"
    class="backdrop-image-item"
    :class="{ active, compact, loading, disabled }"
  >
    <GenLoading v-if="loading" animation-style="width: 60px; height: 60px;" />
    <UIImg v-else class="img" :src="url" size="cover" />
  </div>
</template>

<style lang="scss" scoped>
.backdrop-image-item {
  display: flex;
  width: 140px;
  height: 108px;
  padding: 4px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 2px solid transparent;
  background-color: var(--ui-color-grey-300);
  cursor: pointer;
  overflow: hidden;

  transition:
    width 0.2s ease,
    height 0.2s ease,
    border-radius 0.2s ease;

  &.active {
    background-color: var(--ui-color-turquoise-200);
    border-color: var(--ui-color-turquoise-500);
    cursor: default;
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &.loading {
    cursor: default;
    pointer-events: none;
  }

  &.compact {
    width: 88px;
    height: 68px;
    border-radius: 8px;
  }
}

.img {
  width: 132px;
  height: 100px;
  border-radius: 8px;
  transition:
    width 0.2s ease,
    height 0.2s ease,
    border-radius 0.2s ease;
}

.backdrop-image-item.compact .img {
  width: 80px;
  height: 60px;
  border-radius: 4px;
}
</style>
