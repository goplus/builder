<script lang="ts" setup>
import { UIDropdown } from '@/components/ui'

defineProps<{
  dropdownable: boolean // TODO
}>()
</script>

<template>
  <UIDropdown v-if="dropdownable">
    <!-- trigger button -->
    <!-- dropdown -->
  </UIDropdown>
  <div v-else>
    <!-- only icon trigger button -->
  </div>
</template>

<style lang="scss" scoped></style>
