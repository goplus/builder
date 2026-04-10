<template>
  <UIBlockItem :color="color" :active="selectable && selectable.selected" :interactive="!!selectable">
    <div class="mt-3 mb-3.5">
      <UIImg class="h-[39px] w-[52px] rounded-[4px]" :src="imgSrc" :loading="imgLoading" />
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
