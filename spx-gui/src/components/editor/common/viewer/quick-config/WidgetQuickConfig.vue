<script lang="ts" setup>
import { inject } from 'vue'

import type { Project } from '@/models/project'
import { configTypeInjectionKey } from './QuickConfigWrapper.vue'
import DefaultConfigPanel from './widget/DefaultConfigPanel.vue'
import SizeConfigPanel from './common/SizeConfigPanel.vue'
import PositionConfigPanel from './common/PositionConfigPanel.vue'
import type { WidgetLocalConfig } from './utils'

defineProps<{
  localConfig: WidgetLocalConfig
  project: Project
}>()

const configType = inject(configTypeInjectionKey)
</script>

<template>
  <template v-if="configType != null">
    <SizeConfigPanel v-if="configType === 'size'" name="monitor" :local-config="localConfig" />
    <PositionConfigPanel v-else-if="configType === 'pos'" name="monitor" :local-config="localConfig" />
    <DefaultConfigPanel v-else-if="configType === 'default'" :local-config="localConfig" :project="project" />
  </template>
</template>

<style lang="scss" scoped></style>
