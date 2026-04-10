<template>
  <UIBlockItem
    :color="color"
    :variant="color === 'sound' ? 'colorful' : 'standard'"
    :active="selectable && selectable.selected"
    :interactive="!!selectable"
  >
    <div class="mt-3 mb-4.5 h-9 w-9">
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
    color?: 'sound' | 'primary'
    name: string
    selectable?: false | { selected: boolean }
  }>(),
  {
    color: 'sound',
    selectable: false
  }
)
</script>
