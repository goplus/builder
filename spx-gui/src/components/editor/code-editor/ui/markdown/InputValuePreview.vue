<script setup lang="ts">
import { type InputType } from '../../common'

defineProps<{
  // TODO: pass in whole `input` info

  // Use `typ` instead of `type` to avoid bug here:
  // https://github.com/syntax-tree/hast-util-raw/issues/22
  // https://github.com/syntax-tree/hastscript/issues/21
  typ: InputType
  value: string
}>()
</script>

<template>
  <div>{{ decodeURIComponent(value) }}</div>
</template>

<style lang="scss" scoped></style>
