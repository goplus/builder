<script lang="ts">
export function getDefaultValue() {
  return effectKinds[0].name
}
</script>

<script setup lang="ts">
import { effectKinds } from '@/utils/spx'
import SpxEffectKindItem from './SpxEffectKindItem.vue'

const modelValue = defineModel<string>('value')
</script>

<template>
  <ul class="items">
    <SpxEffectKindItem
      v-for="item in effectKinds"
      :key="item.name"
      :name="item.name"
      size="medium"
      :active="modelValue === item.name"
      @click="modelValue = item.name"
    />
  </ul>
</template>

<style lang="scss" scoped>
.items {
  width: 376px;
  max-height: 280px;
  overflow-y: auto;
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
}
</style>
