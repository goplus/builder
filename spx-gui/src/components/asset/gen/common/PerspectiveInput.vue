<script setup lang="ts">
import { computed } from 'vue'
import { Perspective } from '@/apis/common'
import ParamSelector from './param-settings/ParamSelector.vue'
import { perspectiveOptions } from './param-settings/data'
import imgPerspective from './param-settings/assets/perspective.png'

const props = defineProps<{
  value: Perspective
}>()

const emit = defineEmits<{
  'update:value': [Perspective]
}>()

const placeholder = computed(() => {
  if (props.value !== Perspective.Unspecified) return null
  return {
    label: { en: 'Perspective', zh: '游戏视角' },
    image: imgPerspective
  }
})
</script>

<template>
  <ParamSelector
    :name="{ en: 'Perspective', zh: '游戏视角' }"
    :tips="{ en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }"
    :options="perspectiveOptions"
    :placeholder="placeholder"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
