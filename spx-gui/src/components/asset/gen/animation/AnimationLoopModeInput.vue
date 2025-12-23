<script setup lang="ts">
import type { AnimationLoopMode } from '@/apis/common'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { loopModeOptions } from '../common/param-settings/data'

defineProps<{
  value: AnimationLoopMode
}>()

const emit = defineEmits<{
  'update:value': [AnimationLoopMode]
}>()
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select the loop mode you want to generate', zh: '请选择您想要生成的循环模式' }"
    :options="loopModeOptions"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
