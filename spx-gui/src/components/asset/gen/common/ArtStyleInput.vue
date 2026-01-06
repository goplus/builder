<script lang="ts">
export function toNullable(value: ArtStyle) {
  return value === ArtStyle.Unspecified ? null : value
}

export function fromNullable(value: ArtStyle | null) {
  return value ?? ArtStyle.Unspecified
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { ArtStyle } from '@/apis/common'
import ParamSelector from './param-settings/ParamSelector.vue'
import { artStyleOptions } from './param-settings/data'
import imgArtStyle from './param-settings/assets/art-style.png'

defineProps<{
  value: ArtStyle
}>()

const emit = defineEmits<{
  'update:value': [ArtStyle]
}>()

const placeholder = computed(() => ({
  label: { en: 'Art style', zh: '艺术风格' },
  image: imgArtStyle
}))
</script>

<template>
  <ParamSelector
    :name="{ en: 'Art Style', zh: '艺术风格' }"
    :tips="{ en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }"
    :options="artStyleOptions"
    :placeholder="placeholder"
    :value="toNullable(value)"
    @update:value="emit('update:value', fromNullable($event))"
  />
</template>
