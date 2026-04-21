<template>
  <UIBlockItem :active="selectable && selectable.selected" :interactive="!!selectable">
    <div class="mt-0.5 flex min-h-0 w-full flex-col items-center">
      <UIImg class="h-15 w-20 rounded-[4px]" size="cover" :src="imgSrc" :loading="imgLoading" />
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
  }>(),
  {
    selectable: false
  }
)
</script>
