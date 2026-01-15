<script setup lang="ts">
import { UIImg } from '@/components/ui'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'
import type { File } from '@/models/common/file'
import { useFileUrl } from '@/utils/file'

const props = defineProps<{
  file: File | null
}>()

const [fileUrl, fileUrlLoading] = useFileUrl(() => props.file)
</script>

<template>
  <div class="preview">
    <CheckerboardBackground class="background" />
    <UIImg class="image" :src="fileUrl" :loading="fileUrlLoading" size="contain" />
  </div>
</template>

<style lang="scss" scoped>
.preview {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.background {
  position: absolute;
  inset: 0;
}

.image {
  width: 100%;
  height: 100%;
}
</style>
