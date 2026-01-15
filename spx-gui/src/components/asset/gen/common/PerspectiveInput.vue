<script lang="ts">
export function toNullable(value: Perspective) {
  return value === Perspective.Unspecified ? null : value
}

export function fromNullable(value: Perspective | null) {
  return value ?? Perspective.Unspecified
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { Perspective } from '@/apis/common'
import ParamSelector from './param-settings/ParamSelector.vue'
import { perspectiveOptions } from './param-settings/data'
import imgPerspective from './param-settings/assets/perspective.png'

defineProps<{
  value: Perspective
}>()

const emit = defineEmits<{
  'update:value': [Perspective]
}>()

const placeholder = computed(() => ({
  label: { en: 'Perspective', zh: '游戏视角' },
  image: imgPerspective
}))
</script>

<template>
  <ParamSelector
    :name="{ en: 'Perspective', zh: '游戏视角' }"
    :tips="{ en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }"
    :options="perspectiveOptions"
    :placeholder="placeholder"
    :value="toNullable(value)"
    @update:value="emit('update:value', fromNullable($event))"
  />
</template>
