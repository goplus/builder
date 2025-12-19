<script lang="ts" setup>
import ParamSelector from './ParamSelector.vue'
import { Perspective } from '@/apis/common'

const perspectiveOptions = [
  { value: Perspective.TrueTopDown, label: { en: 'True Top Down', zh: '真俯视' } },
  { value: Perspective.AngledTopDown, label: { en: 'Angled Top Down', zh: '倾斜俯视' } },
  { value: Perspective.SideScrolling, label: { en: 'Side Scrolling', zh: '侧滚动' } },
  { value: Perspective.Unspecified, label: { en: 'Unspecified', zh: '未指定' } }
]

defineProps<{
  value: Perspective
  onlyIcon?: boolean
}>()

defineEmits<{
  (e: 'update:value', value: Perspective): void
}>()
</script>

<template>
  <ParamSelector
    :value="value"
    :options="perspectiveOptions"
    :only-icon="onlyIcon"
    :tips="{ en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }"
    @update:value="$emit('update:value', $event)"
  ></ParamSelector>
</template>

<style lang="scss" scoped></style>
