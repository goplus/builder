<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { File } from '@/models/common/file'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  file: File
  active: boolean
}>()

const [url, loading] = useFileUrl(() => props.file)
</script>

<template>
  <div class="sprite-image-item" :class="{ active }">
    <UIImg class="img" :src="url" :loading="loading" :alt="file.name" :width="100" :height="100" />
  </div>
</template>

<style lang="scss" scoped>
.sprite-image-item {
  display: flex;
  width: 140px;
  height: 140px;
  padding: 4px;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  border-radius: 12px;
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &.active {
    border: 2px solid var(--ui-color-turquoise-500);
    background: var(--ui-color-turquoise-200);
    cursor: default;
  }
}

.img {
  width: 100px;
  height: 100px;
}
</style>
