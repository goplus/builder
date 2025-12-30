<script setup lang="ts">
import type { BackdropCategory } from '@/apis/common'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { backdropCategoryOptions } from '../common/param-settings/data'

defineProps<{
  value: BackdropCategory
}>()

const emit = defineEmits<{
  'update:value': [BackdropCategory]
}>()
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select the backdrop category you want to generate', zh: '请选择您想要生成的背景类别' }"
    :options="backdropCategoryOptions"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
