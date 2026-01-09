<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { File } from '@/models/common/file'
import { UIImg } from '@/components/ui'
import { useImageSelectorCompact } from '../common/ImageSelector.vue'

const props = defineProps<{
  file: File
  active: boolean
}>()

const compact = useImageSelectorCompact()

const [url, loading] = useFileUrl(() => props.file)
</script>

<template>
  <div class="backdrop-image-item" :class="{ active, compact }">
    <UIImg class="img" :src="url" :loading="loading" size="cover" />
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
