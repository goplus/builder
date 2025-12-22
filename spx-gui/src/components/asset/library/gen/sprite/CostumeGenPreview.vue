<script lang="ts" setup>
import type { CostumeItem, SpriteGen } from '@/models/gen/sprite-gen'

defineProps<{
  spriteGen: SpriteGen
  costumeItem: CostumeItem
}>()
</script>

<template>
  <div>costume</div>
</template>

<style lang="scss" scoped></style>
