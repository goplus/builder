<template>
  <UIBlockItem :active="selectable && selectable.selected" :interactive="!!selectable">
    <div class="player-wrapper mt-2 h-9 w-9">
      <slot name="player"></slot>
    </div>
    <UIBlockItemTitle size="medium" :title="name">
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

<style scoped>
.player-wrapper :deep(.play-control-play) {
  box-sizing: border-box;
  padding: 2px;
  background-clip: content-box;
}

.player-wrapper :deep(.play-control-icon) {
  width: 14px;
  height: 14px;
}

.player-wrapper :deep(.play-control-stop .progress) {
  inset: 2px;
  width: 32px;
  height: 32px;
}
</style>
