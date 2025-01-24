<template>
  <UIBlockItem
    :color="color"
    :variant="color === 'sound' ? 'colorful' : 'standard'"
    :active="selected"
    :interactive="selected != null"
  >
    <div class="sound-container">
      <div class="sound-player">
        <slot name="player"></slot>
      </div>
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
    selected?: boolean
  }>(),
  {
    color: 'sound',
    selected: undefined
  }
)
</script>
<style scoped lang="scss">
.sound-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 4px;
}
.sound-player {
  height: 36px;
  width: 36px;
}
</style>
