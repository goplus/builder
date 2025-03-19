<template>
  <UIBlockItem class="ui-sprite-item" size="large" :active="selected" :interactive="!!selectable">
    <slot name="img" :style="imgStyle"></slot>
    <UIBlockItemTitle size="large">
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
  height: '99px',
  width: '99px'
}
</script>
<style scoped lang="scss">
.ui-sprite-item {
  padding: 2px;
}
</style>
