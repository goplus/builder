<template>
  <UIBlockItem :color="color" :active="selectable && selectable.selected" :interactive="!!selectable">
    <div class="icon-container">
      <slot name="icon"></slot>
    </div>
    <UIBlockItemTitle size="medium">
      {{ name }}
      <template v-if="visible === false" #suffix>
        <UIIcon type="eyeOff" />
      </template>
    </UIBlockItemTitle>
    <slot></slot>
  </UIBlockItem>
</template>
<script setup lang="ts">
import UIIcon from '../icons/UIIcon.vue'
import UIBlockItem from './UIBlockItem.vue'
import UIBlockItemTitle from './UIBlockItemTitle.vue'

withDefaults(
  defineProps<{
    name: string
    color?: 'stage' | 'primary'
    selectable?: false | { selected: boolean }
    visible?: boolean
  }>(),
  {
    color: 'stage',
    selectable: false,
    visible: true
  }
)
</script>
<style scoped lang="scss">
.icon-container {
  margin: 12px 0 14px;
  width: 40px;
  height: 40px;

  :deep(> *) {
    width: 100%;
    height: 100%;
  }
}
</style>
