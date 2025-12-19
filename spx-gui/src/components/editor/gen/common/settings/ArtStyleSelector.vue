<script lang="ts" setup>
import ParamSelector from './ParamSelector.vue'
import { ArtStyle } from '@/apis/common'

const artStyleOptions = [
  { value: ArtStyle.PixelArt, label: { en: 'Pixel Art', zh: '像素艺术' } },
  { value: ArtStyle.FlatDesign, label: { en: 'Flat Design', zh: '扁平设计' } },
  { value: ArtStyle.HandDrawn, label: { en: 'Hand Drawn', zh: '手绘' } },
  { value: ArtStyle.LowPoly, label: { en: 'Low Poly', zh: '低多边形' } },
  { value: ArtStyle.Unspecified, label: { en: 'Unspecified', zh: '未指定' } }
]

defineProps<{
  value: ArtStyle
  onlyIcon?: boolean
}>()

defineEmits<{
  (e: 'update:value', value: ArtStyle): void
}>()
</script>

<template>
  <ParamSelector
    :value="value"
    :options="artStyleOptions"
    :only-icon="onlyIcon"
    :tips="{ en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }"
    @update:value="$emit('update:value', $event)"
  ></ParamSelector>
</template>

<style lang="scss" scoped></style>
