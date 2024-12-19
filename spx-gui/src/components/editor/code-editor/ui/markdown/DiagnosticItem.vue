<script setup lang="ts">
import { UIIcon } from '@/components/ui'
import type { DiagnosticSeverity } from '../../common'

defineProps<{
  severity: DiagnosticSeverity
}>()
</script>

<template>
  <div class="diagnostic-item">
    <UIIcon class="icon" :type="severity" />
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.diagnostic-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;
}

.icon {
  margin-top: 1px;
}
</style>
