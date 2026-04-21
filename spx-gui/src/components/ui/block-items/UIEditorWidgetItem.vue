<template>
  <UIBlockItem :active="selectable && selectable.selected" :interactive="!!selectable">
    <div class="icon-container mt-2.5 mb-3 h-10 w-10">
      <slot name="icon"></slot>
    </div>
    <UIBlockItemTitle size="medium">
      {{ name }}
      <template v-if="visible === false" #suffix>
        <UIIcon class="cursor-auto text-grey-700" type="eyeOff" />
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
    selectable?: false | { selected: boolean }
    visible?: boolean | null
  }>(),
  {
    selectable: false,
    visible: null
  }
)
</script>
<style scoped>
.icon-container :deep(> *) {
  width: 100%;
  height: 100%;
}
</style>
