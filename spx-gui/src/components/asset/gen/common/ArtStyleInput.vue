<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArtStyle } from '@/apis/common'
import ParamSelector from './param-settings/ParamSelector.vue'
import { artStyleOptions, getOptionImage } from './param-settings/data'

const props = defineProps<{
  value: ArtStyle
}>()

const emit = defineEmits<{
  'update:value': [ArtStyle]
}>()

const selected = ref(false)
const placeholder = computed(() => {
  if (selected.value || props.value !== ArtStyle.Unspecified) return false
  return {
    label: { en: 'Art Style', zh: '艺术风格' },
    image: getOptionImage('art-style')
  }
})

function handleUpdateValue(value: ArtStyle) {
  selected.value = true
  emit('update:value', value)
}
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }"
    :options="artStyleOptions"
    :placeholder="placeholder"
    :value="value"
    @update:value="handleUpdateValue"
  />
</template>
