<script setup lang="ts">
import { computed } from 'vue'
import { SpriteCategory } from '@/apis/common'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { spriteCategoryOptions } from '../common/param-settings/data'
import imgCategory from '../common/param-settings/assets/category.png'

const props = defineProps<{
  value: SpriteCategory
}>()

const emit = defineEmits<{
  'update:value': [SpriteCategory]
}>()

const placeholder = computed(() => {
  if (props.value !== SpriteCategory.Unspecified) return null
  return {
    label: { en: 'Category', zh: '类型' },
    image: imgCategory
  }
})
</script>

<template>
  <ParamSelector
    :name="{ en: 'Category', zh: '类型' }"
    :tips="{ en: 'Please select the sprite category you want to generate', zh: '请选择您想要生成的精灵类别' }"
    :options="spriteCategoryOptions"
    :placeholder="placeholder"
    :value="value"
    @update:value="emit('update:value', $event)"
  />
</template>
