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
  <ul class="w-94 max-h-70 overflow-y-auto flex-none flex flex-wrap content-start gap-2">
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
