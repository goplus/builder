<script setup lang="ts">
import type { ArtStyle } from '@/apis/common'
import ParamSelector from './param-settings/ParamSelector.vue'
import { artStyleOptions } from './param-settings/data'

defineProps<{
  value: ArtStyle
}>()

const emit = defineEmits<{
  'update:value': [ArtStyle]
}>()
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }"
    :options="artStyleOptions"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
