<template>
  <UIImg class="sprite-preview" :src="imgSrc" :loading="imgLoading" />
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import { useFileUrl } from '@/utils/file'

const props = defineProps<{
  sprite: Sprite
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.sprite.costume?.img)
</script>
