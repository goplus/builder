<template>
  <UIBlockItem size="large" :active="selected" :interactive="!!selectable">
    <div class="mt-0.5 h-23 flex items-center justify-center">
      <div class="h-12 w-12">
        <slot name="player"></slot>
      </div>
    </div>
    <UIBlockItemTitle size="large" class="h-5">
      {{ name }}
    </UIBlockItemTitle>
    <div class="text-center text-2xs text-hint-1">{{ duration }}</div>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import UIBlockItem from './UIBlockItem.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

const props = withDefaults(
  defineProps<{
    duration: string
    name: string
    selectable?: false | { selected: boolean }
  }>(),
  {
    selectable: false
  }
)

const selected = computed(() => props.selectable && props.selectable.selected)
</script>
