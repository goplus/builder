<script setup lang="ts">
import type { Facing } from '@/apis/aigc'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { facingOptions } from '../common/param-settings/data'

defineProps<{
  value: Facing
}>()

const emit = defineEmits<{
  'update:value': [Facing]
}>()
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select which side your costume is facing', zh: '请选择造型面向哪一边' }"
    :options="facingOptions"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
