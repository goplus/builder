<script setup lang="ts">
import { UIIcon } from '@/components/ui'
import type { DiagnosticSeverity } from '../../common'

defineProps<{
  severity: DiagnosticSeverity
}>()
</script>

<template>
  <div class="diagnostic-item" :class="`severity-${severity}`">
    <UIIcon class="icon" :type="severity" />
    <div class="body">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.diagnostic-item {
  padding: 6px 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;
  border-radius: 8px;

  &.severity-warning {
    background-color: var(--ui-color-yellow-200);
  }
  &.severity-error {
    background-color: var(--ui-color-red-100);
  }
}

.icon {
  margin-top: 3px;
}

.body {
  flex: 1;
}
</style>
