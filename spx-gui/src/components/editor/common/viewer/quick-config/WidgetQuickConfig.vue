<script lang="ts" setup>
import { inject } from 'vue'

import type { Project } from '@/models/project'
import { configTypeInjectionKey } from './QuickConfig.vue'
import type { Widget } from '@/models/widget'
import DefaultConfigPanel from './widget/DefaultConfigPanel.vue'
import SizeConfigPanel from './widget/SizeConfigPanel.vue'
import PositionConfigPanel from './widget/PositionConfigPanel.vue'

defineProps<{
  widget: Widget
  project: Project
  size?: number
  x?: number
  y?: number
}>()

defineEmits<{
  'update:size': [number]
  'update:pos': [{ x: number; y: number }]
}>()

const configType = inject(configTypeInjectionKey)
</script>

<template>
  <template v-if="configType != null">
    <SizeConfigPanel
      v-if="configType === 'size' && size != null"
      :widget="widget"
      :size="size"
      @update:size="$emit('update:size', $event)"
    />
    <PositionConfigPanel
      v-else-if="configType === 'pos' && x != null && y != null"
      :widget="widget"
      :x="x"
      :y="y"
      @update:pos="$emit('update:pos', $event)"
    />
    <DefaultConfigPanel v-else-if="configType === 'default'" :widget="widget" :project="project" />
  </template>
</template>

<style lang="scss" scoped></style>
