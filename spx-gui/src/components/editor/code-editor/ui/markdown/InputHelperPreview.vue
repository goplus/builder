<script setup lang="ts">
import { InputHelperType } from '../input-helper'

defineProps<{
  // https://github.com/syntax-tree/hast-util-raw/issues/22
  // https://github.com/syntax-tree/hastscript/issues/21
  typ: InputHelperType
  value: string
}>()
</script>

<template>
  <div>{{ decodeURIComponent(value) }}</div>
</template>

<style lang="scss" scoped></style>
