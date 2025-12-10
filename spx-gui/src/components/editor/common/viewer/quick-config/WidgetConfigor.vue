<script lang="ts" setup>
import { inject } from 'vue'

import type { Project } from '@/models/project'
import { configTypeInjectionKey } from './QuickConfig.vue'
import type { Widget } from '@/models/widget'
import DefaultConfig from './widget/DefaultConfig.vue'
import SizeConfig from './widget/SizeConfig.vue'
import PositionConfig from './widget/PositionConfig.vue'

defineProps<{
  widget: Widget
  project: Project
}>()

const configType = inject(configTypeInjectionKey)
</script>

<template>
  <SizeConfig v-if="configType === 'size'" :widget="widget" :project="project" />
  <PositionConfig v-else-if="configType === 'pos'" :widget="widget" :project="project" />
  <DefaultConfig v-else-if="configType === 'default'" :widget="widget" :project="project" />
</template>

<style lang="scss" scoped></style>
