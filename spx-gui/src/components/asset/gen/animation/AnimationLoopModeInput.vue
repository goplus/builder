<script lang="ts">
export function toNullable(value: AnimationLoopMode) {
  return value
}

export function fromNullable(value: AnimationLoopMode | null) {
  return value ?? AnimationLoopMode.NonLoopable
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { AnimationLoopMode } from '@/apis/common'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { loopModeOptions } from '../common/param-settings/data'
import imgLoopMode from '../common/param-settings/assets/loop-mode.png'

defineProps<{
  value: AnimationLoopMode
}>()

const emit = defineEmits<{
  'update:value': [AnimationLoopMode]
}>()

const placeholder = computed(() => ({
  label: { en: 'Loop mode', zh: '循环模式' },
  image: imgLoopMode
}))
</script>

<template>
  <ParamSelector
    :name="{ en: 'Loop mode', zh: '循环模式' }"
    :tips="{ en: 'Please select the loop mode you want to generate', zh: '请选择您想要生成的循环模式' }"
    :options="loopModeOptions"
    :placeholder="placeholder"
    :value="toNullable(value)"
    @update:value="emit('update:value', fromNullable($event))"
  />
</template>
