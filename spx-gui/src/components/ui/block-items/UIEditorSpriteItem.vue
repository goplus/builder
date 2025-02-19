<template>
  <UIBlockItem class="ui-editor-sprite-item" :color="color" :active="selected" :interactive="!!selectable">
    <slot name="img" :style="imgStyle"></slot>
    <UIBlockItemTitle size="medium">
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
    color?: 'sprite' | 'primary'
  }>(),
  {
    selectable: false,
    color: 'sprite'
  }
)

const selected = computed(() => props.selectable && props.selectable.selected)

const imgStyle = {
  height: '60px',
  width: '60px'
}
</script>
<style scoped lang="scss">
.ui-editor-sprite-item {
  gap: 2px;
}
.img {
  height: 60px;
  width: 60px;
}
</style>
