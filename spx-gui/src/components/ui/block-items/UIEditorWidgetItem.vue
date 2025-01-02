<template>
  <UIBlockItem color="stage" :active="selected" :interactive="selected != null">
    <div class="icon-container">
      <slot name="icon"></slot>
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
    selected?: boolean
  }>(),
  {
    selected: undefined
  }
)
</script>
<style scoped lang="scss">
.icon-container {
  margin: 14px 0 16px;
  width: 36px;
  height: 36px;

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}
</style>
