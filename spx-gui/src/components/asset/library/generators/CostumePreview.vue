<template>
  <div class="costume-preview">
    <UILoading v-if="imgLoading" />
    <img v-else-if="imgSrc" :src="imgSrc" :alt="costume.name" class="costume-image" />
  </div>
</template>

<script setup lang="ts">
import { UILoading } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'

const props = defineProps<{
  costume: Costume
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>

<style lang="scss" scoped>
.costume-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.costume-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
