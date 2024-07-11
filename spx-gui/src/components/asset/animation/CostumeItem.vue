<template>
  <UIBlockItem :active="selected" color="primary">
    <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    <div class="name-container">
      <p class="name">{{ costume.name }}</p>
    </div>
    <UICornerIcon v-show="selected" color="primary" type="check" />
  </UIBlockItem>
</template>

<script setup lang="ts">
import { useFileUrl } from '@/utils/file'
import type { Costume } from '@/models/costume'
import { UIImg, UICornerIcon, UIBlockItem } from '@/components/ui'

const props = defineProps<{
  selected: boolean
  costume: Costume
}>()

const [imgSrc, imgLoading] = useFileUrl(() => props.costume.img)
</script>

<style lang="scss" scoped>
.img {
  flex: 1;
}

.name-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 32px;
  width: 100%;
}
</style>
