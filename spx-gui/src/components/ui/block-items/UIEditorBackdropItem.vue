<template>
  <UIBlockItem :color="color" :active="selectable && selectable.selected" :interactive="!!selectable">
    <div class="img-container">
      <UIImg class="img" :src="imgSrc" :loading="imgLoading" />
    </div>
    <UIBlockItemTitle size="medium">
      {{ name }}
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import UIBlockItem from './UIBlockItem.vue'
import UIImg from '../UIImg.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

withDefaults(
  defineProps<{
    imgSrc: string | null
    imgLoading: boolean
    name: string
    selectable?: false | { selected: boolean }
    color?: 'stage' | 'primary'
  }>(),
  {
    selectable: false,
    color: 'stage'
  }
)
</script>
<style scoped lang="scss">
.img-container {
  margin: 12px 0 14px;
}
.img {
  width: 52px;
  height: 39px;
  border-radius: 4px;
}
</style>
