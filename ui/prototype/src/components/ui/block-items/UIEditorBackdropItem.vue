<template>
  <UIBlockItem :active="selected">
    <div class="mt-0.5 flex min-h-0 w-full flex-col items-center">
      <img class="h-15 w-20 rounded-[4px] object-cover" :src="imgSrc" :alt="name" />
    </div>
    <UIBlockItemTitle size="medium" :title="name">
      {{ name }}
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>

<script setup lang="ts">
import UIBlockItem from '@/components/ui/block-items/UIBlockItem.vue'
import UIBlockItemTitle from '@/components/ui/block-items/UIBlockItemTitle.vue'

defineProps<{
  imgSrc: string
  name: string
  selected?: boolean
}>()
</script>
