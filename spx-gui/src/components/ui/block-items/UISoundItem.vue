<template>
  <UIBlockItem size="large" class="ui-sound-item" :active="selected">
    <div class="sound-container">
      <div class="sound-player">
        <slot name="player"></slot>
      </div>
    </div>
    <UIBlockItemTitle size="large" class="name">
      {{ name }}
    </UIBlockItemTitle>
    <div class="duration">{{ duration }}</div>
    <UICornerIcon v-show="selected" type="check" />
  </UIBlockItem>
</template>
<script setup lang="ts">
import UIBlockItem from './UIBlockItem.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'
import UICornerIcon from './UICornerIcon.vue'

defineProps<{
  duration: string
  name: string
  selected: boolean
}>()
</script>
<style scoped lang="scss">
.ui-sound-item {
  padding: 2px;

  .name {
    height: 20px;
  }
}
.sound-container {
  height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sound-player {
  height: 48px;
  width: 48px;
}
.duration {
  color: var(--ui-color-hint-1);
  text-align: center;
  font-size: 10px;
  line-height: 16px;
  font-weight: 600;
}
</style>
