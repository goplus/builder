<template>
  <UIBlockItem
    :color="color"
    :variant="color === 'sound' ? 'colorful' : 'standard'"
    :active="selectable && selectable.selected"
    :interactive="!!selectable"
  >
    <div class="sound-player">
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
<style scoped lang="scss">
.sound-player {
  margin: 12px 0 18px;
  height: 36px;
  width: 36px;
}
</style>
