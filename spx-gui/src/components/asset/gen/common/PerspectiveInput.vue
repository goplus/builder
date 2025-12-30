<script setup lang="ts">
import { computed, ref } from 'vue'
import { Perspective } from '@/apis/common'
import ParamSelector from './param-settings/ParamSelector.vue'
import { getOptionImage, perspectiveOptions } from './param-settings/data'

const props = defineProps<{
  value: Perspective
}>()

const emit = defineEmits<{
  'update:value': [Perspective]
}>()

const selected = ref(false)
const placeholder = computed(() => {
  if (selected.value || props.value !== Perspective.Unspecified) return false
  return {
    label: { en: 'Perspective', zh: '游戏视角' },
    image: getOptionImage('perspective')
  }
})

function handleUpdateValue(value: Perspective) {
  selected.value = true
  emit('update:value', value)
}
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }"
    :options="perspectiveOptions"
    :placeholder="placeholder"
    :value="value"
    @update:value="handleUpdateValue"
  />
</template>
