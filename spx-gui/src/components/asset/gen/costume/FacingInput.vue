<script lang="ts">
export function toNullable(value: Facing) {
  return value === Facing.Unspecified ? null : value
}

export function fromNullable(value: Facing | null) {
  return value ?? Facing.Unspecified
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Facing } from '@/apis/aigc'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { facingOptions } from '../common/param-settings/data'
import imgFacing from '../common/param-settings/assets/facing.png'

defineProps<{
  value: Facing
}>()

const emit = defineEmits<{
  'update:value': [Facing]
}>()

const placeholder = computed(() => ({
  label: { en: 'Facing', zh: '朝向' },
  image: imgFacing
}))
</script>

<template>
  <ParamSelector
    :name="{ en: 'Facing', zh: '朝向' }"
    :tips="{ en: 'Please select which side your costume is facing', zh: '请选择造型面向哪一边' }"
    :options="facingOptions"
    :placeholder="placeholder"
    :value="toNullable(value)"
    @update:value="emit('update:value', fromNullable($event))"
  />
</template>
