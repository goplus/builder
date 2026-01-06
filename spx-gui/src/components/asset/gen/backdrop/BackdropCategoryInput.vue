<script lang="ts">
export function toNullable(value: BackdropCategory) {
  return value === BackdropCategory.Unspecified ? null : value
}

export function fromNullable(value: BackdropCategory | null) {
  return value ?? BackdropCategory.Unspecified
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { BackdropCategory } from '@/apis/common'
import ParamSelector from '../common/param-settings/ParamSelector.vue'
import { backdropCategoryOptions } from '../common/param-settings/data'
import imgCategory from '../common/param-settings/assets/category.png'

defineProps<{
  value: BackdropCategory
}>()

const emit = defineEmits<{
  'update:value': [BackdropCategory]
}>()

const placeholder = computed(() => ({
  label: { en: 'Category', zh: '类型' },
  image: imgCategory
}))
</script>

<template>
  <ParamSelector
    :name="{ en: 'Category', zh: '类型' }"
    :tips="{ en: 'Please select the backdrop category you want to generate', zh: '请选择您想要生成的背景类别' }"
    :options="backdropCategoryOptions"
    :value="toNullable(value)"
    :placeholder="placeholder"
    @update:value="emit('update:value', fromNullable($event))"
  />
</template>
