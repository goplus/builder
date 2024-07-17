<template>
  <UIBlockItem color="sound" variant="colorful" :active="selected">
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

defineProps<{
  audioSrc: string | null
  name: string
  selected: boolean
}>()
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
