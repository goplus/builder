<template>
  <UIBlockItem
    class="gap-0.5 p-0.5"
    size="large"
    :active="selectable && selectable.selected"
    :interactive="!!selectable"
  >
    <UIImg class="h-[98px] w-[132px] overflow-hidden rounded-[9px]" :src="imgSrc" :loading="imgLoading" />
    <UIBlockItemTitle size="large">
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
