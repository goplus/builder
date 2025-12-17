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
}>()

const configType = inject(configTypeInjectionKey)
</script>

<template>
  <template v-if="configType != null">
    <SizeConfigPanel v-if="configType.type === 'size'" :widget="widget" :project="project" :size="configType.size" />
    <PositionConfigPanel
      v-else-if="configType.type === 'pos'"
      :widget="widget"
      :project="project"
      :x="configType.x"
      :y="configType.y"
    />
    <DefaultConfigPanel v-else-if="configType.type === 'default'" :widget="widget" :project="project" />
  </template>
</template>

<style lang="scss" scoped></style>
