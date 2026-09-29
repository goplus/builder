<script setup lang="ts">
import { UIIcon } from '@/components/ui'
import type { DiagnosticSeverity } from '../../common'

defineProps<{
  severity: DiagnosticSeverity
}>()
</script>

<template>
  <div
    class="flex items-start gap-2 self-stretch px-2 py-1.5 rounded-sm"
    :class="{
      'bg-yellow-200': severity === 'warning',
      'bg-red-100': severity === 'error'
    }"
  >
    <UIIcon class="mt-0.75 flex-none" :type="severity" />
    <div class="min-w-0 flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      <slot></slot>
    </div>
  </div>
</template>
