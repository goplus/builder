<script setup lang="ts">
import type { Perspective } from '@/apis/common'
import ParamSelector from './param-settings/ParamSelector.vue'
import { perspectiveOptions } from './param-settings/data'

defineProps<{
  value: Perspective
}>()

const emit = defineEmits<{
  'update:value': [Perspective]
}>()
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }"
    :options="perspectiveOptions"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
