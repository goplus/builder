<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { CostumeGen } from '@/models/gen/costume-gen'

defineProps<{
  gen: CostumeGen
  active: boolean
}>()
</script>

<template>
  <UIBlockItem :active="active">
    <UIBlockItemTitle size="large">{{ gen.name }}</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
