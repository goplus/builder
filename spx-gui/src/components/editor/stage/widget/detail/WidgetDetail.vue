<template>
  <MonitorDetail v-if="widget instanceof Monitor" :monitor="widget"></MonitorDetail>
</template>

<script setup lang="ts">
import type { Widget } from '@/models/widget'
import { Monitor } from '@/models/widget/monitor'
import MonitorDetail from './MonitorDetail.vue'

defineProps<{
  widget: Widget
}>()
</script>
