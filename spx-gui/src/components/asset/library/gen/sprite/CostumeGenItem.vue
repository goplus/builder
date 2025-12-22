<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { CostumeItem } from '@/models/gen/sprite-gen'

defineEmits<{
  costumeItem: CostumeItem
}>()
</script>

<template>
  <UIBlockItem>
    <UIBlockItemTitle size="large">costume</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
