<script lang="ts">
export function getDefaultValue() {
  return effectKinds[0].name
}
</script>

<script setup lang="ts">
import { effectKinds } from '@/utils/spx'
import SpxEffectKindItem from './SpxEffectKindItem.vue'

defineProps<{
  value: string
}>()

defineEmits<{
  'update:value': [string]
  submit: []
}>()

const modelValue = defineModel<string>('value')
</script>

<template>
  <ul class="w-max max-h-70 overflow-y-auto flex-none grid grid-cols-[repeat(4,max-content)] content-start gap-2">
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
