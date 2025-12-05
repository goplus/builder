<template>
  <NCheckbox v-bind="props" @update:checked="(v) => emit('update:checked', v)">
    <slot></slot>
  </NCheckbox>
</template>

<script setup lang="ts">
import { NCheckbox } from 'naive-ui'

const props = defineProps<{
  checked?: boolean
  value?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:checked': [boolean]
}>()
</script>

<style lang="scss">
.n-checkbox.n-checkbox--checked .n-checkbox-icon .n-base-icon {
  /* **重要：** 这里的 `url(...)` 替换为你自定义的图标 SVG 的 Data URI 或路径。
     **示例：** 这是一个简单的实心圆点 SVG Data URI 
     你可以使用在线工具将你的自定义 SVG 转换为 Data URI。
  */
  mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='8' fill='currentColor'/%3E%3C/svg%3E") !important;

  /* 确保图标有颜色 */
  background-color: #ff4500 !important; /* 你自定义的图标颜色 */

  /* 调整图标大小（可选） */
  width: 14px !important;
  height: 14px !important;
}
</style>
