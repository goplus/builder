<template>
  <UIImg class="backdrop-preview" :src="imgSrc" :loading="imgLoading" />
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import type { Backdrop } from '@/models/backdrop'
import { useFileUrl } from '@/utils/file'

const props = defineProps<{
  backdrop: Backdrop
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.backdrop.img)
</script>
