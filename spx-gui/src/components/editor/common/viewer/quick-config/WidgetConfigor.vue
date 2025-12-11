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
  <SizeConfigPanel v-if="configType === 'size'" :widget="widget" :project="project" />
  <PositionConfigPanel v-else-if="configType === 'pos'" :widget="widget" :project="project" />
  <DefaultConfigPanel v-else-if="configType === 'default'" :widget="widget" :project="project" />
</template>

<style lang="scss" scoped></style>
