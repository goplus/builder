<template>
  <EditorItemDetail :name="costume.name" @rename="emit('rename')">
    <div class="relative flex-1 overflow-hidden rounded-1 w-full">
      <CheckerboardBackground class="absolute inset-0" />
      <UIImg class="h-full w-full" :src="imgSrc" :loading="imgLoading" />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/spx/costume'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import CheckerboardBackground from './CheckerboardBackground.vue'

const props = defineProps<{
  costume: Costume
}>()

const emit = defineEmits<{
  rename: []
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>
