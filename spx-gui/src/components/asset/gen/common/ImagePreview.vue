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
  <div
    v-radar="{ name: 'Image preview', desc: 'Preview of the selected generated image' }"
    class="relative h-full w-full overflow-hidden rounded-1"
  >
    <CheckerboardBackground class="absolute inset-0" />
    <UIImg class="h-full w-full" :src="fileUrl" :loading="fileUrlLoading" size="contain" />
  </div>
</template>
