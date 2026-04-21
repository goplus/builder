<template>
  <UIBlockItem class="p-1" size="large" :active="selectable && selectable.selected" :interactive="!!selectable">
    <UIImg class="h-24.5 w-33 overflow-hidden rounded-sm" size="cover" :src="imgSrc" :loading="imgLoading" />
    <UIBlockItemTitle class="mt-2" size="large">
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
  }>(),
  {
    selectable: false
  }
)
</script>
