<script setup lang="ts">
import { computed, ref } from 'vue'
import { SpriteCategory } from '@/apis/common'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { getOptionImage, spriteCategoryOptions } from '../common/param-settings/data'

const props = defineProps<{
  value: SpriteCategory
  onlyIcon?: boolean
}>()

const emit = defineEmits<{
  'update:value': [SpriteCategory]
}>()

const selected = ref(false)
const placeholder = computed(() => {
  if (selected.value || props.value !== SpriteCategory.Unspecified) return false
  return {
    label: { en: 'Category', zh: '类型' },
    image: getOptionImage('category')
  }
})

function handleUpdateValue(value: SpriteCategory) {
  selected.value = true
  emit('update:value', value)
}
</script>

<template>
  <ParamSelector
    :tips="{ en: 'Please select the sprite category you want to generate', zh: '请选择您想要生成的精灵类别' }"
    :options="spriteCategoryOptions"
    :only-icon="onlyIcon"
    :placeholder="placeholder"
    :value="value"
    @update:value="handleUpdateValue"
  />
</template>
