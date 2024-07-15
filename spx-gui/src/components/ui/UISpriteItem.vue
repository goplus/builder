<template>
  <UIBlockItem color="sprite" :active="selected">
    <div class="img-container">
      <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    </div>
    <UITitle size="medium">
      {{ name }}
    </UITitle>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import UIBlockItem from './UIBlockItem.vue'
import UIImg from './UIImg.vue'
import UITitle from './UITitle.vue'

defineProps<{
  imgSrc: string | null
  imgLoading: boolean
  name: string
  selected: boolean
}>()
</script>
<style scoped lang="scss">
.img-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img {
  height: 60px;
  width: 60px;
}
</style>
