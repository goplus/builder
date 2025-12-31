<script setup lang="ts">
import { computed } from 'vue'
import { ArtStyle } from '@/apis/common'
import ParamSelector from './param-settings/ParamSelector.vue'
import { artStyleOptions } from './param-settings/data'
import imgArtStyle from './param-settings/assets/art-style.png'

const props = defineProps<{
  value: ArtStyle
}>()

const emit = defineEmits<{
  'update:value': [ArtStyle]
}>()

const placeholder = computed(() => {
  if (props.value !== ArtStyle.Unspecified) return null
  return {
    label: { en: 'Art Style', zh: '艺术风格' },
    image: imgArtStyle
  }
})
</script>

<template>
  <ParamSelector
    :name="{ en: 'Art Style', zh: '艺术风格' }"
    :tips="{ en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }"
    :options="artStyleOptions"
    :placeholder="placeholder"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
