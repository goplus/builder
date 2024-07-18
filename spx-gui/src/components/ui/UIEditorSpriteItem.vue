<template>
  <UIBlockItem class="ui-editor-sprite-item" :color="color" :active="selected">
    <UIImg class="img" no-cover :src="imgSrc" :loading="imgLoading" />
    <UIBlockItemTitle size="medium">
      {{ name }}
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import UIBlockItem from './UIBlockItem.vue'
import UIImg from './UIImg.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

withDefaults(
  defineProps<{
    imgSrc: string | null
    imgLoading: boolean
    name: string
    selected: boolean
    color: 'sprite' | 'primary'
  }>(),
  {
    color: 'sprite'
  }
)
</script>
<style scoped lang="scss">
.ui-editor-sprite-item {
  gap: 2px;
}
.img {
  height: 60px;
  width: 60px;
}
</style>
