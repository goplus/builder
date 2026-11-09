<script setup lang="ts">
import { useRenderableImageUrl } from '@/utils/img-rendering'
import type { File } from '@/models/common/file'
import { UIImg } from '@/components/ui'

const props = defineProps<{
  /** Image to send with the reply, not uploaded yet */
  file: File
}>()

const [url, loading] = useRenderableImageUrl(() => props.file)
</script>

<template>
  <UIImg
    class="size-16 rounded-md border border-grey-400 bg-white"
    size="cover"
    :src="url"
    :loading="loading"
    :alt="file.name"
  />
</template>
