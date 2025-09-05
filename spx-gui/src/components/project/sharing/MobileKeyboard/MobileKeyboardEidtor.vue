<template>
  <div>123</div>
</template>

<script setup lang="ts">
import type { MobileKeyboardZoneToKeyMapping } from '@/apis/project'

defineOptions({ name: 'MobileKeyboardEdit' })
defineProps<{
  zoneToKeyMapping: MobileKeyboardZoneToKeyMapping
}>()
defineEmits<{
  resolved: [result: MobileKeyboardZoneToKeyMapping]
}>()
</script>

<style scoped lang="scss"></style>
