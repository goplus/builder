<script setup lang="ts">
import type { SpriteCategory } from '@/apis/common'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { spriteCategoryOptions } from '../common/param-settings/data'

defineProps<{
  value: SpriteCategory
}>()

const emit = defineEmits<{
  'update:value': [SpriteCategory]
}>()
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select the sprite category you want to generate', zh: '请选择您想要生成的精灵类别' }"
    :options="spriteCategoryOptions"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
