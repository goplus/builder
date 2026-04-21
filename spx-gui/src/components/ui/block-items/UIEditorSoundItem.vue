<template>
  <UIBlockItem :active="selectable && selectable.selected" :interactive="!!selectable">
    <div class="my-3 h-9 w-9">
      <slot name="player"></slot>
    </div>
    <UIBlockItemTitle size="medium">
      {{ name }}
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import UIBlockItem from './UIBlockItem.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

withDefaults(
  defineProps<{
    name: string
    selectable?: false | { selected: boolean }
  }>(),
  {
    selectable: false
  }
)
</script>
