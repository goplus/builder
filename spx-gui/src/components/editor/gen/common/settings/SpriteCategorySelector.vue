<script lang="ts" setup>
import ParamSelector from './ParamSelector.vue'
import { SpriteCategory } from '@/apis/common'

const spriteCategoryOptions = [
  { value: SpriteCategory.Character, label: { en: 'Character', zh: '角色' } },
  { value: SpriteCategory.Item, label: { en: 'Item', zh: '物品' } },
  { value: SpriteCategory.Prop, label: { en: 'Prop', zh: '道具' } },
  { value: SpriteCategory.Effect, label: { en: 'Effect', zh: '效果' } },
  { value: SpriteCategory.UI, label: { en: 'UI', zh: 'UI' } },
  { value: SpriteCategory.Unspecified, label: { en: 'Unspecified', zh: '未指定' } }
]

defineProps<{
  value: SpriteCategory
  onlyIcon?: boolean
}>()

defineEmits<{
  (e: 'update:value', value: SpriteCategory): void
}>()
</script>

<template>
  <ParamSelector
    :value="value"
    :options="spriteCategoryOptions"
    :only-icon="onlyIcon"
    :tips="{ en: 'Please select the sprite category you want to generate', zh: '请选择您想要生成的精灵类别' }"
    @update:value="$emit('update:value', $event)"
  ></ParamSelector>
</template>

<style lang="scss" scoped></style>
