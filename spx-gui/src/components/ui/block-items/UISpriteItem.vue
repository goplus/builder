<template>
  <UIBlockItem class="p-1" size="large" :active="selected" :interactive="!!selectable">
    <slot name="img" :style="imgStyle"></slot>
    <UIBlockItemTitle class="mt-2" size="large">
      {{ name }}
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import UIBlockItem from './UIBlockItem.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

const props = withDefaults(
  defineProps<{
    name: string
    selectable?: false | { selected: boolean }
  }>(),
  {
    selectable: false
  }
)

const selected = computed(() => props.selectable && props.selectable.selected)

const imgStyle = {
  height: '98px',
  width: '98px'
}
</script>
